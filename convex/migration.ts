import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// MIGRATION QUERIES - Check migration status
// ============================================================

// Check migration status - items and stock_movements tables no longer exist
export const getMigrationStatus = query({
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const movements = await ctx.db.query("movements").collect();
    const inventory = await ctx.db.query("inventory").collect();

    return {
      items: {
        total: 0,
        migrated: 0,
        pending: 0,
      },
      stockMovements: {
        total: 0,
        migrated: 0,
        pending: 0,
      },
      products: products.length,
      inventory: inventory.length,
      movements: movements.length,
    };
  },
});

// ============================================================
// MIGRATION MUTATIONS
// ============================================================

// Helper to normalize location to the new enum values
function normalizeLocation(location: string): "almacen" | "cafetin" {
  const normalized = location.toLowerCase().trim();
  if (
    normalized.includes("cafet") ||
    normalized.includes("cafe") ||
    normalized === "cafetin"
  ) {
    return "cafetin";
  }
  return "almacen";
}

// DEPRECATED: Items table no longer exists
export const migrateItemsToProducts = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return {
      processed: 0,
      remaining: 0,
      total: 0,
      message: "La tabla items ya no existe. Todos los datos deben usar products.",
    };
  },
});

// DEPRECATED: Items table no longer exists
export const migrateInventory = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return {
      created: 0,
      totalProducts: 0,
      message: "La tabla items ya no existe. Todos los productos deben tener inventory creado directamente.",
    };
  },
});

// DEPRECATED: stock_movements table no longer exists
export const migrateMovements = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return {
      migrated: 0,
      skipped: 0,
      remaining: 0,
      total: 0,
      message: "La tabla stock_movements ya no existe. Todos los movimientos deben usar la tabla movements.",
    };
  },
});

// DEPRECATED: Items and stock_movements tables no longer exist
export const runFullMigration = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return {
      productsCreated: 0,
      inventoryCreated: 0,
      movementsMigrated: 0,
      pendingItems: 0,
      pendingMovements: 0,
      message: "Las tablas items y stock_movements ya no existen. Todos los datos deben usar products e inventory directamente.",
    };
  },
});

// ============================================================
// MIGRATE Cafetín -> Cafetin (area and category, no accent)
// Run once from Convex dashboard before deploying schema/code change.
// ============================================================
export const migrateCafetinNoAccent = mutation({
  args: {},
  handler: async (ctx) => {
    let ordersUpdated = 0;
    const orders = await ctx.db.query("orders").collect();
    for (const order of orders) {
      // Legacy data may have area "Cafetín" (with accent) before schema change
      if ((order.area as string) === "Cafetín") {
        await ctx.db.patch(order._id, { area: "Cafetin" });
        ordersUpdated++;
      }
    }
    let productsUpdated = 0;
    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      if ((product.category as string) === "Cafetín") {
        await ctx.db.patch(product._id, { category: "Cafetin" });
        productsUpdated++;
      }
    }
    return {
      ordersUpdated,
      productsUpdated,
      message: `Migrated ${ordersUpdated} orders and ${productsUpdated} products from Cafetín to Cafetin.`,
    };
  },
});
