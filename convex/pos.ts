import { query } from "./_generated/server";
import { v } from "convex/values";

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

        // Fetch all inventory (could be optimized if we had a proper index for active products inventory)
        // For now, fetching all inventory is okay as it's not huge yet, but ideally we'd filter or join better.
        // In Convex, joins are manual.
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
                // Helper to match existing frontend type shape (partial)
                brand: p.brand,
                purchaseUnit: p.purchaseUnit,
                conversionFactor: p.conversionFactor,
                stockAlmacen: 0, // Not needed for POS but keeps type compat for now
                totalStock: inv ? inv.stockActual : 0,
                status: (inv && inv.stockActual <= (inv.stockMinimo || 0)) ? "bajo_stock" : "ok",
            };
        });

        // Filter only those that should be visible in POS (available for sale + stock > 0 usually, but logic is in frontend)
        // We return all active ones so frontend can cache them.
        return posProducts;
    },
});
