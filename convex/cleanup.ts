import { internalMutation } from "./_generated/server";

/**
 * Cleanup mutation to drop legacy tables that were orphaned after
 * migration to the New Inventory System.
 *
 * LEGACY TABLES TO DELETE:
 * - `items`: Replaced by `products` and `inventory`
 * - `stock_movements`: Replaced by `movements`
 *
 * USAGE:
 * Run from Convex Dashboard or via CLI:
 *   npx convex run cleanup:dropLegacyTables --prod
 *
 * ⚠️ WARNING: This operation is IRREVERSIBLE. Make sure you have
 * backups before running in production.
 */
export const dropLegacyTables = internalMutation({
    args: {},
    handler: async (ctx) => {
        const results = {
            items: 0,
            stock_movements: 0,
            // Uncomment if other legacy tables are detected:
            // other_table: 0,
        };

        // 1. Delete all documents from `items` table
        // Using type assertion since table is not in current schema
        const itemsDocs = await (ctx.db.query as any)("items").collect();
        for (const doc of itemsDocs) {
            await ctx.db.delete(doc._id);
            results.items++;
        }

        // 2. Delete all documents from `stock_movements` table
        const stockMovementsDocs = await (ctx.db.query as any)(
            "stock_movements"
        ).collect();
        for (const doc of stockMovementsDocs) {
            await ctx.db.delete(doc._id);
            results.stock_movements++;
        }

        // 3. (Optional) Add other legacy tables here if detected
        // Example:
        // const otherTableDocs = await (ctx.db.query as any)("other_table").collect();
        // for (const doc of otherTableDocs) {
        //   await ctx.db.delete(doc._id);
        //   results.other_table++;
        // }

        console.log("🧹 Legacy tables cleanup completed:");
        console.log(`   - items: ${results.items} documents deleted`);
        console.log(
            `   - stock_movements: ${results.stock_movements} documents deleted`
        );

        return {
            success: true,
            message: "Legacy tables cleaned up successfully",
            deletedCounts: results,
            totalDeleted: results.items + results.stock_movements,
        };
    },
});
