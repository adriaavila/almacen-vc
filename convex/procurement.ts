import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// QUERIES
// ============================================================

// List all pending supplier orders
export const listPendingOrders = query({
    args: {
        destinationFilter: v.optional(v.union(v.literal("almacen"), v.literal("cafetin"))),
    },
    handler: async (ctx, args) => {
        let orders = await ctx.db
            .query("supplier_orders")
            .withIndex("by_status", (q) => q.eq("status", "pendiente"))
            .order("desc")
            .collect();

        if (args.destinationFilter) {
            orders = orders.filter(o => {
                const dest = o.destination || "almacen";
                return dest === args.destinationFilter;
            });
        }

        // Enrich with item count and first few product names
        const enrichedOrders = await Promise.all(
            orders.map(async (order) => {
                const items = await ctx.db
                    .query("supplier_order_items")
                    .withIndex("by_order", (q) => q.eq("supplierOrderId", order._id))
                    .collect();

                const productNames = await Promise.all(
                    items.slice(0, 3).map(async (item) => {
                        const product = await ctx.db.get(item.productId);
                        return product?.name || "Producto desconocido";
                    })
                );

                return {
                    ...order,
                    itemCount: items.length,
                    previewProducts: productNames,
                };
            })
        );

        return enrichedOrders;
    },
});

// List all supplier orders (with optional status filter)
export const listOrders = query({
    args: {
        status: v.optional(
            v.union(v.literal("pendiente"), v.literal("recibido"), v.literal("cancelado"))
        ),
    },
    handler: async (ctx, args) => {
        if (args.status) {
            return await ctx.db
                .query("supplier_orders")
                .withIndex("by_status", (q) => q.eq("status", args.status!))
                .order("desc")
                .collect();
        }

        return await ctx.db
            .query("supplier_orders")
            .order("desc")
            .collect();
    },
});

// Get a single order with all its items and product details
export const getOrderWithItems = query({
    args: { orderId: v.id("supplier_orders") },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) return null;

        const items = await ctx.db
            .query("supplier_order_items")
            .withIndex("by_order", (q) => q.eq("supplierOrderId", args.orderId))
            .collect();

        // Enrich items with product details
        const enrichedItems = await Promise.all(
            items.map(async (item) => {
                const product = await ctx.db.get(item.productId);
                return {
                    ...item,
                    product: product
                        ? {
                            _id: product._id,
                            name: product.name,
                            brand: product.brand,
                            baseUnit: product.baseUnit,
                            purchaseUnit: product.purchaseUnit,
                            conversionFactor: product.conversionFactor,
                        }
                        : null,
                };
            })
        );

        return {
            ...order,
            items: enrichedItems,
        };
    },
});

// ============================================================
// MUTATIONS
// ============================================================

// Create a new supplier order (draft for WhatsApp)
export const createOrder = mutation({
    args: {
        providerName: v.optional(v.string()),
        destination: v.optional(v.union(v.literal("almacen"), v.literal("cafetin"))),
        items: v.array(
            v.object({
                productId: v.id("products"),
                cantidad: v.number(), // Quantity in Purchase Units
            })
        ),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        if (args.items.length === 0) {
            throw new Error("Debe incluir al menos un producto en el pedido");
        }

        // Validate all products exist and get their details
        const validatedItems = await Promise.all(
            args.items.map(async (item) => {
                const product = await ctx.db.get(item.productId);
                if (!product) {
                    throw new Error(`Producto no encontrado: ${item.productId}`);
                }
                return {
                    productId: item.productId,
                    cantidad: item.cantidad,
                    productName: product.name,
                    purchaseUnit: product.purchaseUnit,
                };
            })
        );

        // Create the order
        const orderId = await ctx.db.insert("supplier_orders", {
            providerName: args.providerName,
            destination: args.destination || "almacen",
            status: "pendiente",
            totalItems: args.items.length,
            notes: args.notes,
            createdAt: Date.now(),
        });

        // Create order items
        for (const item of args.items) {
            await ctx.db.insert("supplier_order_items", {
                supplierOrderId: orderId,
                productId: item.productId,
                cantidadSolicitada: item.cantidad,
            });
        }

        return {
            orderId,
            items: validatedItems,
        };
    },
});

// Receive a supplier order (updates inventory with unit conversion)
export const receiveOrder = mutation({
    args: {
        supplierOrderId: v.id("supplier_orders"),
        items: v.array(
            v.object({
                itemId: v.id("supplier_order_items"),
                productId: v.id("products"),
                cantidadRecibida: v.number(), // Quantity ACTUALLY received in Purchase Units
            })
        ),
        extraItems: v.optional(
            v.array(
                v.object({
                    productId: v.id("products"),
                    cantidadRecibida: v.number(),
                })
            )
        ),
    },
    handler: async (ctx, args) => {
        // Validate order exists and is pending
        const order = await ctx.db.get(args.supplierOrderId);
        if (!order) {
            throw new Error("Pedido no encontrado");
        }
        if (order.status !== "pendiente") {
            throw new Error("Este pedido ya fue procesado o cancelado");
        }

        // Update order status
        await ctx.db.patch(args.supplierOrderId, {
            status: "recibido",
            receivedAt: Date.now(),
        });

        // 1. Process EXISTING items
        for (const item of args.items) {
            // Update the order item with received quantity
            await ctx.db.patch(item.itemId, {
                cantidadRecibida: item.cantidadRecibida,
            });

            await processInventoryUpdate(ctx, item.productId, item.cantidadRecibida, args.supplierOrderId, order.destination || "almacen");
        }

        // 2. Process EXTRA items
        if (args.extraItems && args.extraItems.length > 0) {
            for (const item of args.extraItems) {
                // Create new order item record
                await ctx.db.insert("supplier_order_items", {
                    supplierOrderId: args.supplierOrderId,
                    productId: item.productId,
                    cantidadSolicitada: 0, // Not originally requested
                    cantidadRecibida: item.cantidadRecibida,
                });

                await processInventoryUpdate(ctx, item.productId, item.cantidadRecibida, args.supplierOrderId, order.destination || "almacen");
            }
        }

        return { success: true, orderId: args.supplierOrderId };
    },
});

// Helper to update inventory and record movement
async function processInventoryUpdate(
    ctx: any,
    productId: any,
    cantidadRecibida: number,
    supplierOrderId: any,
    destination: "almacen" | "cafetin"
) {
    if (cantidadRecibida <= 0) return;

    // Get product for conversion factor
    const product = await ctx.db.get(productId);
    if (!product) return;

    // CONVERT: Purchase Units → Base Units
    // e.g., 2 Cajas * 24 units/caja = 48 units
    const quantityToAdd = cantidadRecibida * product.conversionFactor;

    // Find current inventory at the destination location (case-sensitive "Cafetin" for older records mostly, but we use "cafetin" or "almacen" as passed)
    const exactLoc = destination === "cafetin" ? "cafetin" : "almacen";
    const currentInv = await ctx.db
        .query("inventory")
        .withIndex("by_product_location", (q: any) =>
            q.eq("productId", productId).eq("location", exactLoc)
        )
        .first();

    const prevStock = currentInv?.stockActual ?? 0;
    const nextStock = prevStock + quantityToAdd;

    // Update or create inventory record
    if (currentInv) {
        await ctx.db.patch(currentInv._id, {
            stockActual: nextStock,
            updatedAt: Date.now(),
        });
    } else {
        await ctx.db.insert("inventory", {
            productId: productId,
            location: exactLoc,
            stockActual: nextStock,
            stockMinimo: 10, // Default minimum
            updatedAt: Date.now(),
        });
    }

    // Record movement for traceability
    await ctx.db.insert("movements", {
        productId: productId,
        type: "COMPRA",
        from: "PROVEEDOR",
        to: exactLoc.toUpperCase(),
        quantity: quantityToAdd,
        prevStock,
        nextStock,
        user: "Admin", // TODO: Get from auth context
        timestamp: Date.now(),
        supplierOrderId: supplierOrderId,
    });
}

// Cancel a pending supplier order
export const cancelOrder = mutation({
    args: { orderId: v.id("supplier_orders") },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.orderId);
        if (!order) {
            throw new Error("Pedido no encontrado");
        }
        if (order.status !== "pendiente") {
            throw new Error("Solo se pueden cancelar pedidos pendientes");
        }

        await ctx.db.patch(args.orderId, {
            status: "cancelado",
        });

        return { success: true };
    },
});
