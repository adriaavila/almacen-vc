import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// Query: Get all orders
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("orders").collect();
  },
});

// Query: Get order by ID with items populated
export const getById = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) {
      return null;
    }

    // Get orderItems for this order
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect();

    // Populate items (prefer productId, fallback to legacy item)
    const items = await Promise.all(
      orderItems.map(async (oi) => {
        // Prefer productId if available
        if (oi.productId) {
          const product = await ctx.db.get(oi.productId);
          if (product) {
            return {
              _id: product._id,
              nombre: product.name,
              categoria: product.category,
              subcategoria: product.subCategory,
              marca: product.brand,
              unidad: product.baseUnit,
              cantidad: oi.cantidad,
            };
          }
        }

        // Fallback: find product by legacyItemId
        const productId = await findProductByLegacyItemId(ctx, oi.itemId);
        if (productId) {
          const product = await ctx.db.get(productId);
          if (product) {
            // Note: Cannot update orderItem here (query is read-only)
            // Migration should be done separately using migrateOrderItems mutation
            return {
              _id: product._id,
              nombre: product.name,
              categoria: product.category,
              subcategoria: product.subCategory,
              marca: product.brand,
              unidad: product.baseUnit,
              cantidad: oi.cantidad,
            };
          }
        }

        // Last resort: legacy item (should not happen after migration)
        const item = await ctx.db.get(oi.itemId);
        if (!item) {
          return null;
        }
        return {
          ...item,
          cantidad: oi.cantidad,
        };
      })
    );

    return {
      ...order,
      items: items.filter((item) => item !== null),
    };
  },
});

// Query: Get pending orders sorted by date (oldest first)
export const getPending = query({
  handler: async (ctx) => {
    // Use composite index to get pending orders already sorted by createdAt
    // The index ["status", "createdAt"] automatically sorts by createdAt ascending
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_status_createdAt", (q) => 
        q.eq("status", "pendiente")
      )
      .collect();

    return orders;
  },
});

// Query: Get orders by area
export const getByArea = query({
  args: {
    area: v.union(v.literal("Cocina"), v.literal("Cafetín"), v.literal("Limpieza")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_area", (q) => q.eq("area", args.area))
      .collect();
  },
});

// Query: Get last delivered order by area (for suggestions)
export const getLastByArea = query({
  args: {
    area: v.union(v.literal("Cocina"), v.literal("Cafetín"), v.literal("Limpieza")),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_area_status", (q) =>
        q.eq("area", args.area).eq("status", "entregado")
      )
      .collect();

    if (orders.length === 0) {
      return null;
    }

    // Sort by createdAt (most recent first)
    const sorted = orders.sort((a, b) => b.createdAt - a.createdAt);
    return sorted[0];
  },
});

// Mutation: Create a new order with items
export const create = mutation({
  args: {
    area: v.union(v.literal("Cocina"), v.literal("Cafetín"), v.literal("Limpieza")),
    items: v.array(
      v.object({
        itemId: v.optional(v.id("items")), // Legacy - mantener por compatibilidad
        productId: v.optional(v.id("products")), // Nuevo - preferir este
        cantidad: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Filter out items with cantidad 0
    const validItems = args.items.filter((item) => item.cantidad > 0);

    if (validItems.length === 0) {
      throw new Error("El pedido debe incluir al menos un ítem");
    }

    // Create the order
    const orderId = await ctx.db.insert("orders", {
      area: args.area,
      status: "pendiente",
      createdAt: Date.now(),
    });

    // Create orderItems
    for (const item of validItems) {
      if (item.cantidad <= 0) {
        continue;
      }

      let productId: Id<"products"> | undefined;
      let itemId: Id<"items"> | undefined;

      // Prefer productId if provided
      if (item.productId) {
        const product = await ctx.db.get(item.productId);
        if (!product) {
          throw new Error(`Producto con ID ${item.productId} no encontrado`);
        }
        productId = item.productId;
      } else if (item.itemId) {
        // Legacy: find product by legacyItemId
        const foundProductId = await findProductByLegacyItemId(ctx, item.itemId);
        if (!foundProductId) {
          throw new Error(
            `No se encontró producto para itemId ${item.itemId}. Asegúrate de usar productId o que el item haya sido migrado.`
          );
        }
        productId = foundProductId;
        itemId = item.itemId; // Keep for reference
      } else {
        throw new Error("Debe proporcionar productId o itemId");
      }

      // Insert orderItem - itemId is required by schema but can be a dummy value if using productId
      // In practice, we'll use productId as itemId for compatibility during transition
      await ctx.db.insert("orderItems", {
        orderId,
        itemId: itemId || (productId as unknown as Id<"items">), // Required by schema, use productId as fallback
        productId,
        cantidad: item.cantidad,
      });
    }

    return orderId;
  },
});

// Mutation: Deliver an order (atomic transaction)
export const deliver = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) {
      throw new Error(`Pedido con ID ${args.id} no encontrado`);
    }

    if (order.status === "entregado") {
      throw new Error("El pedido ya fue entregado");
    }

    // Get orderItems for this order
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect();

    if (orderItems.length === 0) {
      throw new Error("El pedido no tiene ítems");
    }

    const deliveredItems: Array<{
      itemId: string;
      cantidad: number;
      newStock: number;
    }> = [];
    const lowStockItems: Array<{
      itemId: string;
      nombre: string;
      stock_actual: number;
      stock_minimo: number;
    }> = [];
    const movementIds: Array<string> = [];

    // Determine destination location based on order area
    // Only Cafetín has a dedicated location in the new system
    const shouldTransfer = order.area === "Cafetín";
    const destinationLocation = shouldTransfer ? "cafetin" : null;

    // Process each order item
    for (const oi of orderItems) {
      // Get productId - prefer productId field, fallback to finding by legacyItemId
      let productId: Id<"products">;
      
      if (oi.productId) {
        productId = oi.productId;
      } else {
        // Legacy: find product by legacyItemId
        const foundProductId = await findProductByLegacyItemId(ctx, oi.itemId);
        if (!foundProductId) {
          // Skip if product not found - item may not be migrated yet
          continue;
        }
        productId = foundProductId;
        // Update orderItem with productId for future reference
        await ctx.db.patch(oi._id, {
          productId,
        });
      }

      // Use new inventory system
      await processProductDelivery(
        ctx,
        productId,
        oi.cantidad,
        destinationLocation,
        args.id,
        deliveredItems,
        lowStockItems,
        movementIds
      );
    }

    // Update order status
    await ctx.db.patch(args.id, {
      status: "entregado",
    });

    return {
      deliveredItems,
      lowStockItems,
      movementIds,
    };
  },
});

// Helper function to process product delivery with transfer
async function processProductDelivery(
  ctx: MutationCtx,
  productId: Id<"products">,
  cantidad: number,
  destinationLocation: "cafetin" | null,
  orderId: Id<"orders">,
  deliveredItems: Array<{
    itemId: string;
    cantidad: number;
    newStock: number;
  }>,
  lowStockItems: Array<{
    itemId: string;
    nombre: string;
    stock_actual: number;
    stock_minimo: number;
  }>,
  movementIds: Array<string>
) {
  const product = await ctx.db.get(productId);
  if (!product) {
    throw new Error(`Producto con ID ${productId} no encontrado`);
  }

  // Get almacen inventory
  const almacenInventory = await ctx.db
    .query("inventory")
    .withIndex("by_product_location", (q) =>
      q.eq("productId", productId).eq("location", "almacen")
    )
    .first();

  if (!almacenInventory || almacenInventory.stockActual < cantidad) {
    throw new Error(
      `Stock insuficiente en almacén para ${product.name}. Disponible: ${almacenInventory?.stockActual || 0}, Solicitado: ${cantidad}`
    );
  }

  const now = Date.now();
  const prevAlmacenStock = almacenInventory.stockActual;
  const newAlmacenStock = prevAlmacenStock - cantidad;

  // Update almacen inventory
  await ctx.db.patch(almacenInventory._id, {
    stockActual: newAlmacenStock,
    updatedAt: now,
  });

  let newDestStock = cantidad;
  let prevDestStock = 0;

  // If transfer is needed (Cafetín), update destination inventory
  if (destinationLocation) {
    const destInventory = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q.eq("productId", productId).eq("location", destinationLocation)
      )
      .first();

    prevDestStock = destInventory?.stockActual || 0;
    newDestStock = prevDestStock + cantidad;

    if (destInventory) {
      await ctx.db.patch(destInventory._id, {
        stockActual: newDestStock,
        updatedAt: now,
      });
    } else {
      // Create destination inventory if it doesn't exist
      await ctx.db.insert("inventory", {
        productId,
        location: destinationLocation,
        stockActual: newDestStock,
        stockMinimo: 0,
        updatedAt: now,
      });
    }

    // Create TRASLADO movement
    const movementId = await ctx.db.insert("movements", {
      productId,
      type: "TRASLADO",
      from: "ALMACEN",
      to: destinationLocation.toUpperCase(),
      quantity: cantidad,
      prevStock: prevAlmacenStock,
      nextStock: newAlmacenStock,
      user: "system", // TODO: Add when auth is implemented
      timestamp: now,
    });
    movementIds.push(movementId);
  } else {
    // For Cocina/Limpieza, just create a CONSUMO movement (no transfer)
    const movementId = await ctx.db.insert("movements", {
      productId,
      type: "CONSUMO",
      from: "ALMACEN",
      to: "ALMACEN",
      quantity: cantidad,
      prevStock: prevAlmacenStock,
      nextStock: newAlmacenStock,
      user: "system", // TODO: Add when auth is implemented
      timestamp: now,
    });
    movementIds.push(movementId);
  }

  // Check for low stock in almacen
  const almacenMinStock = almacenInventory.stockMinimo;
  const isLowStock = newAlmacenStock <= almacenMinStock;

  deliveredItems.push({
    itemId: productId,
    cantidad,
    newStock: newAlmacenStock,
  });

  if (isLowStock) {
    lowStockItems.push({
      itemId: productId,
      nombre: product.name,
      stock_actual: newAlmacenStock,
      stock_minimo: almacenMinStock,
    });
  }
}

// Mutation: Update order status
export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.union(v.literal("pendiente"), v.literal("entregado")),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) {
      throw new Error(`Pedido con ID ${args.id} no encontrado`);
    }

    await ctx.db.patch(args.id, {
      status: args.status,
    });

    return args.id;
  },
});

// Mutation: Delete an order and its related orderItems
export const remove = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) {
      throw new Error(`Pedido con ID ${args.id} no encontrado`);
    }

    // Get all orderItems for this order
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect();

    // Delete all orderItems
    for (const orderItem of orderItems) {
      await ctx.db.delete(orderItem._id);
    }

    // Delete the order
    await ctx.db.delete(args.id);

    return args.id;
  },
});

// ============================================================
// MIGRATION FUNCTIONS - Migrate orderItems to use products
// ============================================================

// Helper: Find product by legacyItemId
async function findProductByLegacyItemId(
  ctx: QueryCtx | MutationCtx,
  itemId: Id<"items">
): Promise<Id<"products"> | null> {
  const products = await ctx.db
    .query("products")
    .withIndex("by_legacy_item", (q) => q.eq("legacyItemId", itemId))
    .collect();
  
  if (products.length > 0) {
    return products[0]._id;
  }
  
  return null;
}

// Query: Get orders by date range
export const getOrderByDateRange = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    area: v.optional(v.union(v.literal("Cocina"), v.literal("Cafetín"), v.literal("Limpieza"))),
    status: v.optional(v.union(v.literal("pendiente"), v.literal("entregado"))),
  },
  handler: async (ctx, args) => {
    let orders = await ctx.db.query("orders").collect();

    // Filter by date range
    if (args.startDate !== undefined) {
      orders = orders.filter((o) => o.createdAt >= args.startDate!);
    }
    if (args.endDate !== undefined) {
      orders = orders.filter((o) => o.createdAt <= args.endDate!);
    }

    // Filter by area
    if (args.area) {
      orders = orders.filter((o) => o.area === args.area);
    }

    // Filter by status
    if (args.status) {
      orders = orders.filter((o) => o.status === args.status);
    }

    // Sort by date (oldest first)
    orders.sort((a, b) => a.createdAt - b.createdAt);

    return orders;
  },
});

// Mutation: Migrate a single orderItem to use productId
export const migrateOrderItemToProduct = mutation({
  args: { orderItemId: v.id("orderItems") },
  handler: async (ctx, args) => {
    const orderItem = await ctx.db.get(args.orderItemId);
    if (!orderItem) {
      throw new Error(`OrderItem con ID ${args.orderItemId} no encontrado`);
    }

    // Skip if already migrated
    if (orderItem.productId) {
      return {
        orderItemId: args.orderItemId,
        productId: orderItem.productId,
        migrated: false,
        reason: "Ya tiene productId",
      };
    }

    // Find product by legacyItemId
    const productId = await findProductByLegacyItemId(ctx, orderItem.itemId);
    if (!productId) {
      throw new Error(
        `No se encontró producto para itemId ${orderItem.itemId}. Asegúrate de que el item haya sido migrado a producto primero.`
      );
    }

    // Update orderItem with productId
    await ctx.db.patch(args.orderItemId, {
      productId,
    });

    return {
      orderItemId: args.orderItemId,
      productId,
      migrated: true,
    };
  },
});

// Mutation: Migrate orderItems in batch
export const migrateOrderItems = mutation({
  args: {
    batchSize: v.optional(v.number()),
    orderId: v.optional(v.id("orders")), // Optional: migrate only for specific order
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 50;

    // Get orderItems to migrate
    let orderItems;
    if (args.orderId) {
      // Get orderItems for specific order
      orderItems = await ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId!))
        .collect();
    } else {
      // Get all orderItems without productId
      orderItems = await ctx.db.query("orderItems").collect();
    }

    // Filter orderItems that need migration (no productId)
    const pendingOrderItems = orderItems.filter((oi) => !oi.productId);

    // Process batch
    const toProcess = pendingOrderItems.slice(0, batchSize);
    const migrated: Array<{ orderItemId: string; productId: string }> = [];
    const errors: Array<{ orderItemId: string; error: string }> = [];

    for (const orderItem of toProcess) {
      try {
        const productId = await findProductByLegacyItemId(ctx, orderItem.itemId);
        if (!productId) {
          errors.push({
            orderItemId: orderItem._id,
            error: `No se encontró producto para itemId ${orderItem.itemId}`,
          });
          continue;
        }

        await ctx.db.patch(orderItem._id, {
          productId,
        });

        migrated.push({
          orderItemId: orderItem._id,
          productId: productId,
        });
      } catch (error: any) {
        errors.push({
          orderItemId: orderItem._id,
          error: error.message || "Error desconocido",
        });
      }
    }

    return {
      migrated: migrated.length,
      errors: errors.length,
      remaining: pendingOrderItems.length - migrated.length - errors.length,
      total: pendingOrderItems.length,
      details: {
        migrated,
        errors,
      },
    };
  },
});

// ============================================================
// REPROCESS DELIVERED ORDERS - Fix stock transfers
// ============================================================

// Mutation: Reprocess a delivered order to apply correct stock transfers
export const reprocessDeliveredOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error(`Pedido con ID ${args.orderId} no encontrado`);
    }

    if (order.status !== "entregado") {
      throw new Error("Solo se pueden reprocesar pedidos entregados");
    }

    // Get orderItems
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    if (orderItems.length === 0) {
      throw new Error("El pedido no tiene ítems");
    }

    // Determine destination location based on order area
    const shouldTransfer = order.area === "Cafetín";
    const destinationLocation = shouldTransfer ? "cafetin" : null;

    const processedItems: Array<{
      productId: string;
      productName: string;
      cantidad: number;
      transferred: boolean;
    }> = [];
    const errors: Array<{ orderItemId: string; error: string }> = [];

    // Process each orderItem
    for (const oi of orderItems) {
      try {
        // Ensure orderItem has productId
        let productId: Id<"products">;
        if (oi.productId) {
          productId = oi.productId;
        } else {
          // Migrate orderItem first
          const foundProductId = await findProductByLegacyItemId(ctx, oi.itemId);
          if (!foundProductId) {
            errors.push({
              orderItemId: oi._id,
              error: `No se encontró producto para itemId ${oi.itemId}`,
            });
            continue;
          }
          productId = foundProductId;
          // Update orderItem with productId
          await ctx.db.patch(oi._id, {
            productId,
          });
        }

        const product = await ctx.db.get(productId);
        if (!product) {
          errors.push({
            orderItemId: oi._id,
            error: `Producto ${productId} no encontrado`,
          });
          continue;
        }

        // Only process transfers for Cafetín orders
        if (shouldTransfer && destinationLocation) {
          // Get almacen inventory
          const almacenInventory = await ctx.db
            .query("inventory")
            .withIndex("by_product_location", (q) =>
              q.eq("productId", productId).eq("location", "almacen")
            )
            .first();

          if (!almacenInventory) {
            errors.push({
              orderItemId: oi._id,
              error: `No hay inventario en almacén para ${product.name}`,
            });
            continue;
          }

          // Get or create destination inventory
          const destInventory = await ctx.db
            .query("inventory")
            .withIndex("by_product_location", (q) =>
              q.eq("productId", productId).eq("location", destinationLocation)
            )
            .first();

          const now = Date.now();
          const prevDestStock = destInventory?.stockActual || 0;
          const newDestStock = prevDestStock + oi.cantidad;

          // Update or create destination inventory
          if (destInventory) {
            await ctx.db.patch(destInventory._id, {
              stockActual: newDestStock,
              updatedAt: now,
            });
          } else {
            await ctx.db.insert("inventory", {
              productId,
              location: destinationLocation,
              stockActual: newDestStock,
              stockMinimo: 0,
              updatedAt: now,
            });
          }

          // Create TRASLADO movement with original order timestamp
          await ctx.db.insert("movements", {
            productId,
            type: "TRASLADO",
            from: "ALMACEN",
            to: destinationLocation.toUpperCase(),
            quantity: oi.cantidad,
            prevStock: almacenInventory.stockActual,
            nextStock: almacenInventory.stockActual, // Stock de almacén no cambia (ya fue descontado antes)
            user: "system",
            timestamp: order.createdAt, // Use original order timestamp
          });

          processedItems.push({
            productId: productId,
            productName: product.name,
            cantidad: oi.cantidad,
            transferred: true,
          });
        } else {
          // For non-Cafetín orders, just mark as processed
          processedItems.push({
            productId: productId,
            productName: product.name,
            cantidad: oi.cantidad,
            transferred: false,
          });
        }
      } catch (error: any) {
        errors.push({
          orderItemId: oi._id,
          error: error.message || "Error desconocido",
        });
      }
    }

    return {
      orderId: args.orderId,
      processed: processedItems.length,
      errors: errors.length,
      items: processedItems,
      errorsDetails: errors,
    };
  },
});

// Mutation: Reprocess all delivered orders (batch)
export const reprocessAllDeliveredOrders = mutation({
  args: {
    batchSize: v.optional(v.number()),
    area: v.optional(v.union(v.literal("Cocina"), v.literal("Cafetín"), v.literal("Limpieza"))),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 10;

    // Get all delivered orders
    let orders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "entregado"))
      .collect();

    // Filter by area if specified
    if (args.area) {
      orders = orders.filter((o) => o.area === args.area);
    }

    // Sort by date (oldest first)
    orders.sort((a, b) => a.createdAt - b.createdAt);

    // Process batch
    const toProcess = orders.slice(0, batchSize);
    const results: Array<{
      orderId: string;
      success: boolean;
      processed: number;
      errors: number;
    }> = [];

    for (const order of toProcess) {
      try {
        // Get orderItems
        const orderItems = await ctx.db
          .query("orderItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();

        if (orderItems.length === 0) {
          results.push({
            orderId: order._id,
            success: true,
            processed: 0,
            errors: 0,
          });
          continue;
        }

        const shouldTransfer = order.area === "Cafetín";
        const destinationLocation = shouldTransfer ? "cafetin" : null;
        let processed = 0;
        let errors = 0;

        for (const oi of orderItems) {
          try {
            // Ensure orderItem has productId
            let productId: Id<"products">;
            if (oi.productId) {
              productId = oi.productId;
            } else {
              const foundProductId = await findProductByLegacyItemId(ctx, oi.itemId);
              if (!foundProductId) {
                errors++;
                continue;
              }
              productId = foundProductId;
              await ctx.db.patch(oi._id, { productId });
            }

            const product = await ctx.db.get(productId);
            if (!product) {
              errors++;
              continue;
            }

            // Only process transfers for Cafetín orders
            if (shouldTransfer && destinationLocation) {
              const almacenInventory = await ctx.db
                .query("inventory")
                .withIndex("by_product_location", (q) =>
                  q.eq("productId", productId).eq("location", "almacen")
                )
                .first();

              if (!almacenInventory) {
                errors++;
                continue;
              }

              const destInventory = await ctx.db
                .query("inventory")
                .withIndex("by_product_location", (q) =>
                  q.eq("productId", productId).eq("location", destinationLocation)
                )
                .first();

              const now = Date.now();
              const prevDestStock = destInventory?.stockActual || 0;
              const newDestStock = prevDestStock + oi.cantidad;

              if (destInventory) {
                await ctx.db.patch(destInventory._id, {
                  stockActual: newDestStock,
                  updatedAt: now,
                });
              } else {
                await ctx.db.insert("inventory", {
                  productId,
                  location: destinationLocation,
                  stockActual: newDestStock,
                  stockMinimo: 0,
                  updatedAt: now,
                });
              }

              // Create TRASLADO movement with original order timestamp
              await ctx.db.insert("movements", {
                productId,
                type: "TRASLADO",
                from: "ALMACEN",
                to: destinationLocation.toUpperCase(),
                quantity: oi.cantidad,
                prevStock: almacenInventory.stockActual,
                nextStock: almacenInventory.stockActual,
                user: "system",
                timestamp: order.createdAt,
              });

              processed++;
            } else {
              processed++;
            }
          } catch (error: any) {
            errors++;
          }
        }

        results.push({
          orderId: order._id,
          success: true,
          processed,
          errors,
        });
      } catch (error: any) {
        results.push({
          orderId: order._id,
          success: false,
          processed: 0,
          errors: 1,
        });
      }
    }

    return {
      processed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      remaining: orders.length - toProcess.length,
      total: orders.length,
      results,
    };
  },
});
