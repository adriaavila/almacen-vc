import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper function to calculate status
function calculateStatus(
  stock_actual: number,
  stock_minimo: number
): "ok" | "bajo_stock" {
  return stock_actual <= stock_minimo ? "bajo_stock" : "ok";
}

// Mutation: Seed items (can be called from frontend or Convex dashboard)
export const seedItems = mutation({
  args: {
    items: v.array(
      v.object({
        nombre: v.string(),
        categoria: v.string(),
        subcategoria: v.optional(v.string()),
        marca: v.optional(v.string()),
        unidad: v.string(),
        stock_actual: v.number(),
        stock_minimo: v.number(),
        package_size: v.optional(v.string()),
        location: v.string(),
        extra_notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Check if items already exist
    const existingItems = await ctx.db.query("items").collect();
    if (existingItems.length > 0) {
      // Don't seed if items already exist
      return {
        success: false,
        message: "Items already exist. Clear database first if you want to reseed.",
        existingCount: existingItems.length,
      };
    }

    const insertedIds = [];

    for (const item of args.items) {
      const status = calculateStatus(item.stock_actual, item.stock_minimo);

      const itemId = await ctx.db.insert("items", {
        nombre: item.nombre,
        categoria: item.categoria,
        subcategoria: item.subcategoria,
        marca: item.marca,
        unidad: item.unidad,
        stock_actual: item.stock_actual,
        stock_minimo: item.stock_minimo,
        package_size: item.package_size,
        location: item.location,
        extra_notes: item.extra_notes,
        status,
      });

      insertedIds.push(itemId);
    }

    return {
      success: true,
      message: `Successfully seeded ${insertedIds.length} items`,
      count: insertedIds.length,
    };
  },
});

// Mutation: Clear all data (useful for development)
export const clearAll = mutation({
  handler: async (ctx) => {
    // Delete all orderItems first (foreign key constraints)
    const orderItems = await ctx.db.query("orderItems").collect();
    for (const oi of orderItems) {
      await ctx.db.delete(oi._id);
    }

    // Delete all orders
    const orders = await ctx.db.query("orders").collect();
    for (const order of orders) {
      await ctx.db.delete(order._id);
    }

    // Delete all items
    const items = await ctx.db.query("items").collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    return {
      success: true,
      message: "All data cleared",
      deleted: {
        items: items.length,
        orders: orders.length,
        orderItems: orderItems.length,
      },
    };
  },
});
