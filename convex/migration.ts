import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// MIGRATION QUERIES - Check migration status
// ============================================================

// Check how many items need to be migrated
export const getMigrationStatus = query({
  handler: async (ctx) => {
    const items = await ctx.db.query("items").collect();
    const products = await ctx.db.query("products").collect();
    const stockMovements = await ctx.db.query("stock_movements").collect();
    const movements = await ctx.db.query("movements").collect();
    const inventory = await ctx.db.query("inventory").collect();

    // Count items that have been migrated (have a corresponding product)
    const migratedItemIds = new Set(
      products
        .filter((p) => p.legacyItemId)
        .map((p) => p.legacyItemId)
    );

    // Count movements that have been migrated
    const migratedMovementIds = new Set(
      movements
        .filter((m) => m.legacyMovementId)
        .map((m) => m.legacyMovementId)
    );

    return {
      items: {
        total: items.length,
        migrated: migratedItemIds.size,
        pending: items.length - migratedItemIds.size,
      },
      stockMovements: {
        total: stockMovements.length,
        migrated: migratedMovementIds.size,
        pending: stockMovements.length - migratedMovementIds.size,
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

// Migrate items to products (batch processing)
export const migrateItemsToProducts = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 50;

    // Get all items
    const items = await ctx.db.query("items").collect();

    // Get already migrated items
    const products = await ctx.db.query("products").collect();
    const migratedItemIds = new Set(
      products
        .filter((p) => p.legacyItemId)
        .map((p) => p.legacyItemId?.toString())
    );

    // Filter items that haven't been migrated yet
    const pendingItems = items.filter(
      (item) => !migratedItemIds.has(item._id.toString())
    );

    // Process batch
    const toProcess = pendingItems.slice(0, batchSize);
    const migrated: string[] = [];

    for (const item of toProcess) {
      // Create product from item
      const productId = await ctx.db.insert("products", {
        name: item.nombre,
        brand: item.marca || "",
        category: item.categoria,
        subCategory: item.subcategoria,
        // Use actual unidad value as baseUnit (per plan requirements)
        baseUnit: item.unidad,
        purchaseUnit: item.unidad, // Initially same as baseUnit
        conversionFactor: 1, // Default: 1 purchaseUnit = 1 baseUnit
        active: item.active !== false, // Default to true if undefined
        legacyItemId: item._id,
      });

      migrated.push(item._id.toString());
    }

    return {
      processed: migrated.length,
      remaining: pendingItems.length - migrated.length,
      total: items.length,
    };
  },
});

// Migrate inventory records (stock per location)
export const migrateInventory = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 50;

    // Get all products with legacy item reference
    const products = await ctx.db.query("products").collect();
    const productsWithLegacy = products.filter((p) => p.legacyItemId);

    // Get existing inventory records
    const existingInventory = await ctx.db.query("inventory").collect();
    const existingKeys = new Set(
      existingInventory.map((inv) => `${inv.productId}_${inv.location}`)
    );

    // Process products that don't have inventory yet
    const now = Date.now();
    let created = 0;

    for (const product of productsWithLegacy.slice(0, batchSize)) {
      // Get the original item
      const item = await ctx.db.get(product.legacyItemId!);
      if (!item) continue;

      // Normalize location
      const location = normalizeLocation(item.location);
      const key = `${product._id}_${location}`;

      // Skip if inventory already exists for this product-location
      if (existingKeys.has(key)) continue;

      // Create inventory record
      await ctx.db.insert("inventory", {
        productId: product._id,
        location,
        stockActual: item.stock_actual,
        stockMinimo: item.stock_minimo,
        updatedAt: now,
      });

      existingKeys.add(key);
      created++;
    }

    return {
      created,
      totalProducts: productsWithLegacy.length,
    };
  },
});

// Migrate stock_movements to movements
export const migrateMovements = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 50;

    // Get all stock_movements
    const stockMovements = await ctx.db.query("stock_movements").collect();

    // Get already migrated movements
    const movements = await ctx.db.query("movements").collect();
    const migratedIds = new Set(
      movements
        .filter((m) => m.legacyMovementId)
        .map((m) => m.legacyMovementId?.toString())
    );

    // Filter movements that haven't been migrated
    const pendingMovements = stockMovements.filter(
      (m) => !migratedIds.has(m._id.toString())
    );

    // Get products for lookup
    const products = await ctx.db.query("products").collect();
    const itemToProduct = new Map(
      products
        .filter((p) => p.legacyItemId)
        .map((p) => [p.legacyItemId!.toString(), p._id])
    );

    // Process batch
    const toProcess = pendingMovements.slice(0, batchSize);
    let migrated = 0;
    let skipped = 0;

    for (const movement of toProcess) {
      // Find corresponding product
      const productId = itemToProduct.get(movement.itemId.toString());
      if (!productId) {
        skipped++;
        continue; // Skip if item hasn't been migrated to products yet
      }

      // Map type and motivo to new movement type
      let type: "COMPRA" | "TRASLADO" | "CONSUMO" | "AJUSTE";
      let from: string | undefined;
      let to: string;

      if (movement.type === "ingreso") {
        if (movement.motivo === "compra") {
          type = "COMPRA";
          from = "PROVEEDOR";
          to = "ALMACEN";
        } else if (movement.motivo === "ajuste") {
          type = "AJUSTE";
          from = undefined;
          to = "ALMACEN";
        } else {
          type = "COMPRA";
          from = "PROVEEDOR";
          to = "ALMACEN";
        }
      } else {
        // egreso
        if (movement.motivo === "consumo") {
          type = "CONSUMO";
          from = "ALMACEN";
          to = "USO";
        } else if (movement.motivo === "ajuste") {
          type = "AJUSTE";
          from = "ALMACEN";
          to = "AJUSTE";
        } else if (movement.motivo === "mantenimiento") {
          type = "CONSUMO";
          from = "ALMACEN";
          to = "MANTENIMIENTO";
        } else {
          type = "CONSUMO";
          from = "ALMACEN";
          to = "USO";
        }
      }

      // Create new movement
      await ctx.db.insert("movements", {
        productId,
        type,
        from,
        to,
        quantity: movement.cantidad,
        prevStock: 0, // Historical data - we don't have exact prev/next values
        nextStock: 0,
        user: movement.createdBy || "sistema",
        timestamp: movement.createdAt,
        legacyMovementId: movement._id,
      });

      migrated++;
    }

    return {
      migrated,
      skipped,
      remaining: pendingMovements.length - migrated - skipped,
      total: stockMovements.length,
    };
  },
});

// Run all migrations in sequence
export const runFullMigration = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize || 100;

    // Step 1: Migrate items to products
    const items = await ctx.db.query("items").collect();
    const products = await ctx.db.query("products").collect();
    const migratedItemIds = new Set(
      products.filter((p) => p.legacyItemId).map((p) => p.legacyItemId?.toString())
    );

    const pendingItems = items.filter(
      (item) => !migratedItemIds.has(item._id.toString())
    );

    let productsCreated = 0;
    for (const item of pendingItems.slice(0, batchSize)) {
      await ctx.db.insert("products", {
        name: item.nombre,
        brand: item.marca || "",
        category: item.categoria,
        subCategory: item.subcategoria,
        baseUnit: item.unidad,
        purchaseUnit: item.unidad,
        conversionFactor: 1,
        active: item.active !== false,
        legacyItemId: item._id,
      });
      productsCreated++;
    }

    // Step 2: Create inventory for new products
    const allProducts = await ctx.db.query("products").collect();
    const existingInventory = await ctx.db.query("inventory").collect();
    const existingKeys = new Set(
      existingInventory.map((inv) => `${inv.productId}_${inv.location}`)
    );

    let inventoryCreated = 0;
    const now = Date.now();

    for (const product of allProducts.filter((p) => p.legacyItemId)) {
      const item = await ctx.db.get(product.legacyItemId!);
      if (!item) continue;

      const location = normalizeLocation(item.location);
      const key = `${product._id}_${location}`;

      if (!existingKeys.has(key)) {
        await ctx.db.insert("inventory", {
          productId: product._id,
          location,
          stockActual: item.stock_actual,
          stockMinimo: item.stock_minimo,
          updatedAt: now,
        });
        existingKeys.add(key);
        inventoryCreated++;
      }
    }

    // Step 3: Migrate movements
    const stockMovements = await ctx.db.query("stock_movements").collect();
    const movements = await ctx.db.query("movements").collect();
    const migratedMovementIds = new Set(
      movements.filter((m) => m.legacyMovementId).map((m) => m.legacyMovementId?.toString())
    );

    const itemToProduct = new Map(
      allProducts.filter((p) => p.legacyItemId).map((p) => [p.legacyItemId!.toString(), p._id])
    );

    const pendingMovements = stockMovements.filter(
      (m) => !migratedMovementIds.has(m._id.toString())
    );

    let movementsMigrated = 0;
    for (const movement of pendingMovements.slice(0, batchSize)) {
      const productId = itemToProduct.get(movement.itemId.toString());
      if (!productId) continue;

      let type: "COMPRA" | "TRASLADO" | "CONSUMO" | "AJUSTE";
      let from: string | undefined;
      let to: string;

      if (movement.type === "ingreso") {
        type = movement.motivo === "ajuste" ? "AJUSTE" : "COMPRA";
        from = movement.motivo === "ajuste" ? undefined : "PROVEEDOR";
        to = "ALMACEN";
      } else {
        if (movement.motivo === "ajuste") {
          type = "AJUSTE";
          from = "ALMACEN";
          to = "AJUSTE";
        } else {
          type = "CONSUMO";
          from = "ALMACEN";
          to = movement.motivo === "mantenimiento" ? "MANTENIMIENTO" : "USO";
        }
      }

      await ctx.db.insert("movements", {
        productId,
        type,
        from,
        to,
        quantity: movement.cantidad,
        prevStock: 0,
        nextStock: 0,
        user: movement.createdBy || "sistema",
        timestamp: movement.createdAt,
        legacyMovementId: movement._id,
      });
      movementsMigrated++;
    }

    return {
      productsCreated,
      inventoryCreated,
      movementsMigrated,
      pendingItems: pendingItems.length - productsCreated,
      pendingMovements: pendingMovements.length - movementsMigrated,
    };
  },
});
