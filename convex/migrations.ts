
import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Migration: Convert "Camila" orders to "Las casas"
export const migrateCamilaToLasCasas = mutation({
    args: {},
    handler: async (ctx) => {
        // We can't query by "Camila" using getByArea because we updated the schema types but maybe the data is still there.
        // However, if we query all orders, we can filter them. Or we can use internalList and filter.
        const allOrders = await ctx.db.query("orders").collect();

        // Filter manually because the index might rely on the value being compliant with the schema if we used valid types... 
        // but here we just read everything.
        const camilaOrders = allOrders.filter((o) => (o.area as any) === "Camila");

        console.log(`Found ${camilaOrders.length} orders with area 'Camila'`);

        let count = 0;
        for (const order of camilaOrders) {
            await ctx.db.patch(order._id, { area: "Las casas" } as any);
            count++;
        }

        return { success: true, migrated: count };
    },
});
