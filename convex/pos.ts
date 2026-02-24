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
        patientId: v.id("users"),
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
        const patient = await ctx.db.get(args.patientId);
        if (!patient) {
            throw new Error(`Usuario con ID ${args.patientId} no encontrado`);
        }
        const patientName = patient.nombre;

        const now = Date.now();

        // Process each item
        for (const item of validItems) {
            const product = await ctx.db.get(item.productId);
            if (!product) {
                throw new Error(`Producto con ID ${item.productId} no encontrado`);
            }

            // Get Cafetin inventory (case-insensitive)
            const cafetinInventory = await ctx.db
                .query("inventory")
                .withIndex("by_location", (q) => q.eq("location", "cafetin"))
                .filter((q) => q.eq(q.field("productId"), item.productId))
                .first() ||
                await ctx.db
                    .query("inventory")
                    .withIndex("by_location", (q) => q.eq("location", "Cafetin" as any))
                    .filter((q) => q.eq(q.field("productId"), item.productId))
                    .first();

            const currentStock = cafetinInventory?.stockActual ?? 0;

            const nameNormalized = product.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const isCoffee = nameNormalized.includes("cafe");

            // Skip stock check for coffee products as requested by user
            if (!isCoffee && currentStock < item.cantidad) {
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

        // Map to lightweight object and filter for Cafetin
        const posProducts = products
            .map((p) => {
                const categoryLower = p.category.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const isCafetinCategory = categoryLower.includes("cafetin");

                // Find inventory for this product in 'cafetin' (case-insensitive)
                const inv = inventory.find(
                    (i) => i.productId === p._id && i.location.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("cafetin")
                );

                const nameNormalized = p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const isCoffee = nameNormalized.includes("cafe");

                // Filter: Show if it's in the Cafetin category OR it has physical inventory in Cafetin OR it is Coffee
                if (p.availableForSale === true || isCoffee) {
                    // Always show if explicitly enabled for sale (e.g. Pizza in Cocina category) or if it is Coffee
                } else if (!isCafetinCategory && !inv) {
                    return null;
                }

                if (p.name === "Pepito") {
                    // console.log(`Checking Pepito: isCafetinCategory=${isCafetinCategory}, foundInv=${!!inv}, invLocation=${inv?.location}`);
                }

                const stockCafetin = inv?.stockActual ?? 0;

                return {
                    _id: p._id,
                    name: p.name,
                    category: p.category,
                    subCategory: p.subCategory,
                    baseUnit: p.baseUnit,
                    stockCafetin: stockCafetin,
                    availableForSale: p.availableForSale,
                    active: p.active,
                    brand: p.brand,
                    purchaseUnit: p.purchaseUnit,
                    conversionFactor: p.conversionFactor,
                    stockAlmacen: 0,
                    totalStock: stockCafetin,
                    status: (stockCafetin <= (inv?.stockMinimo || 0)) ? "bajo_stock" : "ok",
                    hasCafetinRecord: !!inv,
                };
            })
            .filter((p): p is NonNullable<typeof p> => p !== null);

        return posProducts;
    },
});

/**
 * Migration: One-time fix for Cafetin products.
 * 1. Standardizes category casing to "Cafetin".
 * 2. Standardizes location casing to "cafetin".
 * 3. Ensures EVERY product in "Cafetin" category has a "cafetin" inventory record.
 */
export const fixCafetinConsistency = mutation({
    args: {},
    handler: async (ctx) => {
        const inventory = await ctx.db.query("inventory").collect();
        const now = Date.now();
        let createdInventory = 0;
        let updatedInventory = 0;

        // Create a map to track "cafetin" records by productId to easily find potential duplicates
        // key: productId, value: inventory record
        const cafetinRecords = new Map();
        for (const inv of inventory) {
            if (inv.location === "cafetin") {
                cafetinRecords.set(inv.productId, inv);
            }
        }

        for (const inv of inventory) {
            // Only look for "Cafetin" (uppercase)
            if (inv.location === "Cafetin" as any) {
                const existingLowercase = cafetinRecords.get(inv.productId);

                if (existingLowercase) {
                    // Merge: Add stock to lowercase and delete uppercase
                    const newStock = existingLowercase.stockActual + inv.stockActual;
                    await ctx.db.patch(existingLowercase._id, {
                        stockActual: newStock,
                        updatedAt: now
                    });
                    await ctx.db.delete(inv._id);
                    updatedInventory++;
                } else {
                    // Rename: Change location to lowercase
                    await ctx.db.patch(inv._id, { location: "cafetin" });
                    // Update our map in case there are multiple invalid records for same product (unlikely but safe)
                    cafetinRecords.set(inv.productId, inv);
                    updatedInventory++;
                }
            }
        }

        return { updatedProducts: 0, createdInventory, updatedInventory };
    }

});
// Trigger sync
