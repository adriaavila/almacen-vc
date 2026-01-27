import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper function to calculate status
function calculateStatus(
  stock_actual: number,
  stock_minimo: number
): "ok" | "bajo_stock" {
  return stock_actual <= stock_minimo ? "bajo_stock" : "ok";
}

// DEPRECATED: Use products and inventory instead of items
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
    // Check if products already exist
    const existingProducts = await ctx.db.query("products").collect();
    if (existingProducts.length > 0) {
      return {
        success: false,
        message: "Products already exist. Clear database first if you want to reseed.",
        existingCount: existingProducts.length,
      };
    }

    const insertedIds = [];
    const now = Date.now();

    // Helper to normalize location
    function normalizeLocation(location: string): "almacen" | "cafetin" {
      const normalized = location.toLowerCase().trim();
      if (normalized.includes("cafet") || normalized.includes("cafe") || normalized === "cafetin") {
        return "cafetin";
      }
      return "almacen";
    }

    for (const item of args.items) {
      // Create product
      const productId = await ctx.db.insert("products", {
        name: item.nombre,
        brand: item.marca || "",
        category: item.categoria,
        subCategory: item.subcategoria,
        baseUnit: item.unidad,
        purchaseUnit: item.unidad, // Default: same as baseUnit
        conversionFactor: 1, // Default: 1 purchaseUnit = 1 baseUnit
        active: true,
      });

      // Create inventory record
      const location = normalizeLocation(item.location);
      await ctx.db.insert("inventory", {
        productId,
        location,
        stockActual: item.stock_actual,
        stockMinimo: item.stock_minimo,
        updatedAt: now,
      });

      insertedIds.push(productId);
    }

    return {
      success: true,
      message: `Successfully seeded ${insertedIds.length} products with inventory`,
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

    // Delete all inventory
    const inventory = await ctx.db.query("inventory").collect();
    for (const inv of inventory) {
      await ctx.db.delete(inv._id);
    }

    // Delete all products
    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    // Delete all movements
    const movements = await ctx.db.query("movements").collect();
    for (const movement of movements) {
      await ctx.db.delete(movement._id);
    }

    return {
      success: true,
      message: "All data cleared",
      deleted: {
        products: products.length,
        inventory: inventory.length,
        movements: movements.length,
        orders: orders.length,
        orderItems: orderItems.length,
      },
    };
  },
});
