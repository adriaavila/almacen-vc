import { query, mutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// Query: Get all orders
// Last sync attempt
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("orders").collect();
  },
});

// Internal Query: Get all orders (for use in internalActions)
export const internalList = internalQuery({
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

    // Populate items using productId only
    const items = await Promise.all(
      orderItems.map(async (oi) => {
        // Use only productId - skip if not available
        if (!oi.productId) {
          return null;
        }

        const product = await ctx.db.get(oi.productId);
        if (!product) {
          return null;
        }

        return {
          _id: product._id,
          orderItemId: oi._id,
          nombre: product.name,
          categoria: product.category,
          subcategoria: product.subCategory,
          marca: product.brand,
          unidad: product.baseUnit,
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
    area: v.union(
      v.literal("Cocina"),
      v.literal("Cafetin"),
      v.literal("Limpieza"),
      v.literal("Las casas")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_area", (q) => q.eq("area", args.area as any))
      .collect();
  },
});

// Query: Get last delivered order by area (for suggestions)
export const getLastByArea = query({
  args: {
    area: v.union(v.literal("Cocina"), v.literal("Cafetin"), v.literal("Limpieza"), v.literal("Las casas")),
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

// Mutation: Create a new order with items (warehouse orders only — POS uses pos.registerSale)
export const create = mutation({
  args: {
    area: v.union(v.literal("Cocina"), v.literal("Cafetin"), v.literal("Limpieza"), v.literal("Las casas")),
    patientId: v.optional(v.id("users")),
    items: v.array(
      v.object({
        productId: v.id("products"),
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
    const createdAt = Date.now();
    const orderId = await ctx.db.insert("orders", {
      area: args.area,
      status: "pendiente",
      createdAt,
      patientId: args.patientId,
    });

    // Array para construir los items de la notificación
    const notificationItems: Array<{ name: string; quantity: number }> = [];

    // Create orderItems
    for (const item of validItems) {
      if (item.cantidad <= 0) {
        continue;
      }

      const product = await ctx.db.get(item.productId);
      if (!product) {
        throw new Error(`Producto con ID ${item.productId} no encontrado`);
      }

      // Insert orderItem
      await ctx.db.insert("orderItems", {
        orderId,
        productId: item.productId,
        cantidad: item.cantidad,
      });

      notificationItems.push({
        name: product.name,
        quantity: item.cantidad,
      });
    }

    // Send Telegram notification for warehouse orders
    await ctx.scheduler.runAfter(0, internal.telegram.sendNotification, {
      orderId,
      area: args.area,
      createdAt,
      items: notificationItems,
    });

    return orderId;
  },
});

// Mutation: Update order items quantities
export const updateItems = mutation({
  args: {
    orderId: v.id("orders"),
    items: v.array(
      v.object({
        orderItemId: v.id("orderItems"),
        cantidad: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error(`Pedido con ID ${args.orderId} no encontrado`);
    }

    if (order.status !== "pendiente") {
      throw new Error("Solo se pueden modificar pedidos pendientes");
    }

    for (const item of args.items) {
      const orderItem = await ctx.db.get(item.orderItemId);
      if (!orderItem) {
        throw new Error(`Item con ID ${item.orderItemId} no encontrado`);
      }

      if (orderItem.orderId !== args.orderId) {
        throw new Error(`El item ${item.orderItemId} no pertenece al pedido ${args.orderId}`);
      }

      // Update quantity
      if (item.cantidad > 0) {
        await ctx.db.patch(item.orderItemId, {
          cantidad: item.cantidad,
        });
      } else {
        // Option: Delete if 0? For now let's enforce > 0 from UI, but if backend receives 0 we could delete or throw.
        // Let's delete it if 0, effectively removing the item from order.
        await ctx.db.delete(item.orderItemId);
      }
    }

    return { success: true };
  },
});

// Mutation: Deliver a warehouse order (atomic transaction)
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

    // Process each order item (warehouse delivery only)
    for (const oi of orderItems) {
      if (!oi.productId) {
        continue;
      }

      const product = await ctx.db.get(oi.productId);
      const effectiveDestination: "cafetin" | null =
        order.area === "Cafetin" && product?.availableForSale !== false ? "cafetin" : null;

      await processProductDelivery(
        ctx,
        oi.productId,
        oi.cantidad,
        effectiveDestination,
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

/** True if category is Cafetin (comparison ignores case and accents). */
function isCafetinCategory(category: string): boolean {
  const normalized = category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return normalized === "cafetin";
}

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
  // Validate that orderId is provided (required for movements from order delivery)
  if (!orderId) {
    throw new Error("orderId es requerido para crear movimientos desde entrega de pedidos");
  }

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

  // Cafetin order + product category Cafetin: if no stock in almacen, approve as supplier intake (COMPRA to cafetin only)
  if (
    destinationLocation === "cafetin" &&
    isCafetinCategory(product.category ?? "") &&
    (!almacenInventory || almacenInventory.stockActual < cantidad)
  ) {
    const now = Date.now();
    const cafetinInventory = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q.eq("productId", productId).eq("location", "cafetin")
      )
      .first();

    const prevCafetinStock = cafetinInventory?.stockActual ?? 0;
    const newCafetinStock = prevCafetinStock + cantidad;

    if (cafetinInventory) {
      await ctx.db.patch(cafetinInventory._id, {
        stockActual: newCafetinStock,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("inventory", {
        productId,
        location: "cafetin",
        stockActual: newCafetinStock,
        stockMinimo: 0,
        updatedAt: now,
      });
    }

    const movementId = await ctx.db.insert("movements", {
      productId,
      type: "COMPRA",
      from: "PROVEEDOR",
      to: "CAFETIN",
      quantity: cantidad,
      prevStock: prevCafetinStock,
      nextStock: newCafetinStock,
      user: "system",
      timestamp: now,
      orderId,
    });
    movementIds.push(movementId);

    deliveredItems.push({
      itemId: productId,
      cantidad,
      newStock: newCafetinStock,
    });
    return;
  }

  // Require stock in almacen for Cocina/Limpieza (or Cafetin when almacen had enough — handled above)
  if (!almacenInventory || almacenInventory.stockActual < cantidad) {
    const disponible = almacenInventory?.stockActual ?? 0;
    throw new Error(
      `Stock insuficiente en almacén para ${product.name}. Disponible: ${disponible} ${product.baseUnit}, Solicitado: ${cantidad} ${product.baseUnit}`
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

  // If transfer is needed (Cafetin), update destination inventory
  if (destinationLocation) {
    const destInventory = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q.eq("productId", productId).eq("location", destinationLocation)
      )
      .first();

    prevDestStock = destInventory?.stockActual ?? 0;
    newDestStock = prevDestStock + cantidad;

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

    const movementId = await ctx.db.insert("movements", {
      productId,
      type: "TRASLADO",
      from: "ALMACEN",
      to: destinationLocation.toUpperCase(),
      quantity: cantidad,
      prevStock: prevAlmacenStock,
      nextStock: newAlmacenStock,
      user: "system",
      timestamp: now,
      orderId,
    });
    movementIds.push(movementId);
  } else {
    const movementId = await ctx.db.insert("movements", {
      productId,
      type: "CONSUMO",
      from: "ALMACEN",
      to: "CONSUMO",
      quantity: cantidad,
      prevStock: prevAlmacenStock,
      nextStock: newAlmacenStock,
      user: "system",
      timestamp: now,
      orderId,
    });
    movementIds.push(movementId);
  }

  const almacenMinStock = almacenInventory.stockMinimo;
  const isLowStock = newAlmacenStock <= almacenMinStock;

  deliveredItems.push({
    itemId: productId,
    cantidad,
    newStock: newAlmacenStock,
  });

  if (isLowStock) {
    const isCafetinProduct = (product?.category || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") === "cafetin";

    if (!isCafetinProduct) {
      lowStockItems.push({
        itemId: productId,
        nombre: product.name,
        stock_actual: newAlmacenStock,
        stock_minimo: almacenMinStock,
      });
    }
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


// Query: Get orders by date range
export const getOrderByDateRange = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    area: v.optional(v.union(v.literal("Cocina"), v.literal("Cafetin"), v.literal("Limpieza"), v.literal("Las casas"))),
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
// DEPRECATED: Esta función ya no es necesaria ya que solo se usa productId
export const migrateOrderItemToProduct = mutation({
  args: { orderItemId: v.id("orderItems") },
  handler: async (ctx, args) => {
    const orderItem = await ctx.db.get(args.orderItemId);
    if (!orderItem) {
      throw new Error(`OrderItem con ID ${args.orderItemId} no encontrado`);
    }

    // If already has productId, return success
    if (orderItem.productId) {
      return {
        orderItemId: args.orderItemId,
        productId: orderItem.productId,
        migrated: false,
        reason: "Ya tiene productId",
      };
    }

    // Cannot migrate without productId - items table no longer exists
    throw new Error(
      `OrderItem no tiene productId y la tabla items ya no existe. Este orderItem necesita ser recreado con productId.`
    );
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
        // Cannot migrate without productId - items table no longer exists
        errors.push({
          orderItemId: orderItem._id,
          error: `OrderItem no tiene productId y la tabla items ya no existe. Este orderItem necesita ser recreado con productId.`,
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

    const processedItems: Array<{
      productId: string;
      productName: string;
      cantidad: number;
      transferred: boolean;
    }> = [];
    const errors: Array<{ orderItemId: string; error: string }> = [];

    // Process each orderItem (only transfer to cafetin when product is available for sale)
    for (const oi of orderItems) {
      try {
        // Use only productId - skip if not available
        if (!oi.productId) {
          errors.push({
            orderItemId: oi._id,
            error: `OrderItem no tiene productId`,
          });
          continue;
        }

        const productId = oi.productId;

        const product = await ctx.db.get(productId);
        if (!product) {
          errors.push({
            orderItemId: oi._id,
            error: `Producto ${productId} no encontrado`,
          });
          continue;
        }

        const effectiveDestination: "cafetin" | null =
          order.area === "Cafetin" && product.availableForSale !== false ? "cafetin" : null;

        if (effectiveDestination === "cafetin") {
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
              q.eq("productId", productId).eq("location", effectiveDestination)
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
              location: effectiveDestination,
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
            to: effectiveDestination.toUpperCase(),
            quantity: oi.cantidad,
            prevStock: almacenInventory.stockActual,
            nextStock: almacenInventory.stockActual, // Stock de almacén no cambia (ya fue descontado antes)
            user: "system",
            timestamp: order.createdAt, // Use original order timestamp
            orderId: args.orderId,
          });

          processedItems.push({
            productId: productId,
            productName: product.name,
            cantidad: oi.cantidad,
            transferred: true,
          });
        } else {
          // For non-Cafetin orders, just mark as processed
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
    area: v.optional(v.union(v.literal("Cocina"), v.literal("Cafetin"), v.literal("Limpieza"))),
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

        let processed = 0;
        let errors = 0;

        for (const oi of orderItems) {
          try {
            // Use only productId - skip if not available
            if (!oi.productId) {
              errors++;
              continue;
            }

            const productId = oi.productId;

            const product = await ctx.db.get(productId);
            if (!product) {
              errors++;
              continue;
            }

            const effectiveDestination: "cafetin" | null =
              order.area === "Cafetin" && product.availableForSale !== false ? "cafetin" : null;

            if (effectiveDestination === "cafetin") {
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
                  q.eq("productId", productId).eq("location", effectiveDestination)
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
                  location: effectiveDestination,
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
                to: effectiveDestination.toUpperCase(),
                quantity: oi.cantidad,
                prevStock: almacenInventory.stockActual,
                nextStock: almacenInventory.stockActual,
                user: "system",
                timestamp: order.createdAt,
                orderId: order._id,
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



