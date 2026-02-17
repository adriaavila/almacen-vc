import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Count POS sales created today (since midnight local time).
 * Counts unique sale batches from cafetin_sales table.
 */
export const todayPosSalesCount = query({
    args: {},
    handler: async (ctx) => {
        // Get start of today (UTC-4, Venezuela time)
        const now = new Date();
        const offsetMs = -4 * 60 * 60 * 1000; // UTC-4
        const localNow = new Date(now.getTime() + offsetMs);
        const startOfDay = new Date(
            localNow.getFullYear(),
            localNow.getMonth(),
            localNow.getDate()
        );
        // Convert back to UTC timestamp
        const startTimestamp = startOfDay.getTime() - offsetMs;

        // Count unique sale timestamps from cafetin_sales today
        // Each registerSale call uses the same timestamp for all items in the batch
        const todaySales = await ctx.db
            .query("cafetin_sales")
            .withIndex("by_fecha", (q) => q.gte("fecha", startTimestamp))
            .collect();

        // Group by fecha to count unique sale batches
        const uniqueTimestamps = new Set(todaySales.map((s) => s.fecha));
        return uniqueTimestamps.size;
    },
});

/**
 * Register a POS sale directly.
 * Consumes cafetín stock, creates CONSUMO movements, and inserts cafetin_sales records.
 * Does NOT create orders/orderItems — POS sales are completely separate.
 */
export const registerSale = mutation({
    args: {
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
            throw new Error("La venta debe incluir al menos un ítem");
        }

        // Resolve patient name
        let patientName = "Sin Asignar";
        if (args.patientId) {
            const patient = await ctx.db.get(args.patientId);
            patientName = patient?.nombre || "Sin Asignar";
        }

        const now = Date.now();

        // Process each item
        for (const item of validItems) {
            const product = await ctx.db.get(item.productId);
            if (!product) {
                throw new Error(`Producto con ID ${item.productId} no encontrado`);
            }

            // Get Cafetin inventory
            const cafetinInventory = await ctx.db
                .query("inventory")
                .withIndex("by_product_location", (q) =>
                    q.eq("productId", item.productId).eq("location", "cafetin")
                )
                .first();

            const currentStock = cafetinInventory?.stockActual ?? 0;

            if (currentStock < item.cantidad) {
                throw new Error(
                    `Stock insuficiente en Cafetín para ${product.name}. Disponible: ${currentStock} ${product.baseUnit ?? "unidades"}`
                );
            }

            const newStock = currentStock - item.cantidad;

            // Update Cafetin inventory
            if (cafetinInventory) {
                await ctx.db.patch(cafetinInventory._id, {
                    stockActual: newStock,
                    updatedAt: now,
                });
            } else {
                await ctx.db.insert("inventory", {
                    productId: item.productId,
                    location: "cafetin",
                    stockActual: newStock,
                    stockMinimo: 0,
                    updatedAt: now,
                });
            }

            // Register CONSUMO movement
            await ctx.db.insert("movements", {
                productId: item.productId,
                type: "CONSUMO",
                from: "CAFETIN",
                to: "CONSUMO",
                quantity: item.cantidad,
                prevStock: currentStock,
                nextStock: newStock,
                user: "pos",
                timestamp: now,
            });

            // Register in cafetin_sales for daily RAW export
            await ctx.db.insert("cafetin_sales", {
                paciente: patientName,
                producto: product.name,
                cantidad: item.cantidad,
                fecha: now,
                sentToN8n: false,
            });
        }

        return { success: true };
    },
});

/**
 * Lightweight query for POS.
 * Returns only essential product fields to reduce payload size.
 * Joins with inventory to get cafetín stock.
 */
export const listStart = query({
    args: {},
    handler: async (ctx) => {
        // Fetch all active products
        const products = await ctx.db
            .query("products")
            .filter((q) => q.eq(q.field("active"), true))
            .collect();

        // Fetch all inventory
        const inventory = await ctx.db.query("inventory").collect();

        // Map to lightweight object
        const posProducts = products.map((p) => {
            // Find inventory for this product in 'cafetin'
            const inv = inventory.find(
                (i) => i.productId === p._id && i.location === "cafetin"
            );

            return {
                _id: p._id,
                name: p.name,
                category: p.category,
                subCategory: p.subCategory,
                baseUnit: p.baseUnit,
                stockCafetin: inv ? inv.stockActual : 0,
                availableForSale: p.availableForSale,
                active: p.active,
                brand: p.brand,
                purchaseUnit: p.purchaseUnit,
                conversionFactor: p.conversionFactor,
                stockAlmacen: 0,
                totalStock: inv ? inv.stockActual : 0,
                status: (inv && inv.stockActual <= (inv.stockMinimo || 0)) ? "bajo_stock" : "ok",
            };
        });

        return posProducts;
    },
});
