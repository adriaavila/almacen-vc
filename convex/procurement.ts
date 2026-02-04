import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// QUERIES
// ============================================================

// List all pending supplier orders
export const listPendingOrders = query({
    handler: async (ctx) => {
        const orders = await ctx.db
            .query("supplier_orders")
            .withIndex("by_status", (q) => q.eq("status", "pendiente"))
            .order("desc")
            .collect();

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

        // Process each item
        for (const item of args.items) {
            // Update the order item with received quantity
            await ctx.db.patch(item.itemId, {
                cantidadRecibida: item.cantidadRecibida,
            });

            // Get product for conversion factor
            const product = await ctx.db.get(item.productId);
            if (!product) continue;

            // CONVERT: Purchase Units → Base Units
            // e.g., 2 Cajas * 24 units/caja = 48 units
            const quantityToAdd = item.cantidadRecibida * product.conversionFactor;

            // Find current inventory at ALMACEN
            const currentInv = await ctx.db
                .query("inventory")
                .withIndex("by_product_location", (q) =>
                    q.eq("productId", item.productId).eq("location", "almacen")
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
                    productId: item.productId,
                    location: "almacen",
                    stockActual: nextStock,
                    stockMinimo: 10, // Default minimum
                    updatedAt: Date.now(),
                });
            }

            // Record movement for traceability
            await ctx.db.insert("movements", {
                productId: item.productId,
                type: "COMPRA",
                from: "PROVEEDOR",
                to: "ALMACEN",
                quantity: quantityToAdd,
                prevStock,
                nextStock,
                user: "Admin", // TODO: Get from auth context
                timestamp: Date.now(),
            });
        }

        return { success: true, orderId: args.supplierOrderId };
    },
});

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
