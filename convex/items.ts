import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper function to calculate status based on stock
function calculateStatus(
  stock_actual: number,
  stock_minimo: number
): "ok" | "bajo_stock" {
  return stock_actual <= stock_minimo ? "bajo_stock" : "ok";
}

// Helper function to normalize product name for brand aggregation
// Removes brand-specific suffixes and normalizes the name
function normalizeProductKey(nombre: string): string {
  return nombre
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Normalize multiple spaces
    .replace(/\s*-\s*/g, " ") // Replace hyphens with spaces
    .replace(/\s*\/\s*/g, " ") // Replace slashes with spaces
    .replace(/\b(genérica|generic|marca|brand)\b/gi, "") // Remove generic brand indicators
    .trim();
}

// Helper function to normalize string for comparison (removes accents)
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove diacritics
}

// Query: Get all items
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("items").collect();
  },
});

// Query: Get item by ID
export const getById = query({
  args: { id: v.id("items") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Query: Get items by status
export const getByStatus = query({
  args: { status: v.union(v.literal("ok"), v.literal("bajo_stock")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("items")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

// Query: Get items with low stock (admin-only, global evaluation)
export const getLowStock = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("items")
      .withIndex("by_status", (q) => q.eq("status", "bajo_stock"))
      .collect();
  },
});

// Query: Get items filtered by role/area
// Admin sees all active items, workers see only items assigned to their area
export const listItemsForRole = query({
  args: {
    role: v.union(
      v.literal("admin"),
      v.literal("Cocina"),
      v.literal("Cafetín"),
      v.literal("Limpieza")
    ),
  },
  handler: async (ctx, args) => {
    const allItems = await ctx.db.query("items").collect();

    // Admin sees all active items
    if (args.role === "admin") {
      return allItems.filter((item) => item.active !== false);
    }

    // Cocina and Cafetín see all active items without restriction
    if (args.role === "Cocina" || args.role === "Cafetín") {
      const filteredItems = allItems.filter((item) => item.active !== false);
      
      // Apply brand aggregation for worker views
      const productMap = new Map<
        string,
        {
          item: typeof filteredItems[0];
          totalStock: number;
        }
      >();

      for (const item of filteredItems) {
        const productKey = normalizeProductKey(item.nombre);
        const existing = productMap.get(productKey);

        if (existing) {
          // Aggregate stock across brands
          existing.totalStock += item.stock_actual;
          // Keep the item with highest stock for metadata
          if (item.stock_actual > existing.item.stock_actual) {
            existing.item = item;
          }
        } else {
          productMap.set(productKey, {
            item,
            totalStock: item.stock_actual,
          });
        }
      }

      // Return aggregated items with combined stock, hiding brand details
      return Array.from(productMap.values()).map(({ item, totalStock }) => {
        // Create a copy without marca field for workers
        const { marca, ...itemWithoutBrand } = item;
        return {
          ...itemWithoutBrand,
          stock_actual: totalStock, // Use aggregated stock
          // Recalculate status based on aggregated stock
          status: calculateStatus(totalStock, item.stock_minimo),
        };
      });
    }

    // Limpieza sees items of their category OR items explicitly shared via sharedAreas
    // This means:
    // - Limpieza sees: items with categoria="Limpieza" OR items with sharedAreas including "Limpieza"
    // Note: Category comparison is normalized to handle accent differences
    const filteredItems = allItems.filter((item) => {
      // Must be active
      if (item.active === false) return false;

      // Check if item belongs to the worker's category (normalized comparison to handle accents)
      const normalizedCategory = normalizeForComparison(item.categoria);
      const normalizedRole = normalizeForComparison(args.role);
      const matchesCategory = normalizedCategory === normalizedRole;

      // Check if item is explicitly shared with the worker's area
      const matchesSharedAreas = 
        item.sharedAreas && 
        item.sharedAreas.length > 0 && 
        item.sharedAreas.includes(args.role);

      // Return true if item matches category OR is shared with the area
      return matchesCategory || matchesSharedAreas;
    });

    // Apply brand aggregation for worker views
    // Group items by normalized product name and aggregate stock
    const productMap = new Map<
      string,
      {
        item: typeof filteredItems[0];
        totalStock: number;
      }
    >();

    for (const item of filteredItems) {
      const productKey = normalizeProductKey(item.nombre);
      const existing = productMap.get(productKey);

      if (existing) {
        // Aggregate stock across brands
        existing.totalStock += item.stock_actual;
        // Keep the item with highest stock for metadata
        if (item.stock_actual > existing.item.stock_actual) {
          existing.item = item;
        }
      } else {
        productMap.set(productKey, {
          item,
          totalStock: item.stock_actual,
        });
      }
    }

    // Return aggregated items with combined stock, hiding brand details
    return Array.from(productMap.values()).map(({ item, totalStock }) => {
      // Create a copy without marca field for workers
      const { marca, ...itemWithoutBrand } = item;
      return {
        ...itemWithoutBrand,
        stock_actual: totalStock, // Use aggregated stock
        // Recalculate status based on aggregated stock
        status: calculateStatus(totalStock, item.stock_minimo),
      };
    });
  },
});

// Mutation: Update stock of an item
export const updateStock = mutation({
  args: {
    id: v.id("items"),
    newStock: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.newStock < 0) {
      throw new Error("El stock no puede ser negativo");
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error(`Item con ID ${args.id} no encontrado`);
    }

    const status = calculateStatus(args.newStock, item.stock_minimo);

    await ctx.db.patch(args.id, {
      stock_actual: args.newStock,
      status,
      updatedAt: Date.now(),
    });

    return { id: args.id, stock_actual: args.newStock, status };
  },
});

// Mutation: Decrement stock (used when delivering orders)
export const decrementStock = mutation({
  args: {
    id: v.id("items"),
    cantidad: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.cantidad <= 0) {
      throw new Error("La cantidad debe ser mayor a 0");
    }

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error(`Item con ID ${args.id} no encontrado`);
    }

    const newStock = Math.max(0, item.stock_actual - args.cantidad);
    const status = calculateStatus(newStock, item.stock_minimo);

    await ctx.db.patch(args.id, {
      stock_actual: newStock,
      status,
      updatedAt: Date.now(),
    });

    return {
      id: args.id,
      stock_actual: newStock,
      status,
      wasLowStock: newStock <= item.stock_minimo,
    };
  },
});

// Mutation: Create a new item
export const create = mutation({
  args: {
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
    active: v.optional(v.boolean()),
    sharedAreas: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    if (args.stock_actual < 0) {
      throw new Error("El stock no puede ser negativo");
    }

    const status = calculateStatus(args.stock_actual, args.stock_minimo);
    const now = Date.now();

    const itemId = await ctx.db.insert("items", {
      nombre: args.nombre,
      categoria: args.categoria,
      subcategoria: args.subcategoria,
      marca: args.marca,
      unidad: args.unidad,
      stock_actual: args.stock_actual,
      stock_minimo: args.stock_minimo,
      package_size: args.package_size,
      location: args.location,
      extra_notes: args.extra_notes,
      status,
      active: args.active ?? true,
      sharedAreas: args.sharedAreas,
      updatedAt: now,
    });

    return itemId;
  },
});

// Mutation: Update any field of an item
// This function allows updating any field(s) of an existing item
export const update = mutation({
  args: {
    id: v.id("items"),
    nombre: v.optional(v.string()),
    categoria: v.optional(v.string()),
    subcategoria: v.optional(v.string()),
    marca: v.optional(v.string()),
    unidad: v.optional(v.string()),
    stock_actual: v.optional(v.number()),
    stock_minimo: v.optional(v.number()),
    package_size: v.optional(v.string()),
    location: v.optional(v.string()),
    extra_notes: v.optional(v.string()),
    active: v.optional(v.boolean()),
    sharedAreas: v.optional(v.array(v.string())),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const item = await ctx.db.get(id);
    if (!item) {
      throw new Error(`Item con ID ${id} no encontrado`);
    }

    // Calculate status if stock fields are being updated
    let status = item.status;
    const stock_actual = updates.stock_actual ?? item.stock_actual;
    const stock_minimo = updates.stock_minimo ?? item.stock_minimo;
    status = calculateStatus(stock_actual, stock_minimo);

    if (stock_actual < 0) {
      throw new Error("El stock no puede ser negativo");
    }

    await ctx.db.patch(id, {
      ...updates,
      status,
      updatedAt: Date.now(),
    });

    return { id, status };
  },
});

// Mutation: Toggle active status
export const toggleActive = mutation({
  args: {
    id: v.id("items"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error(`Item con ID ${args.id} no encontrado`);
    }

    // Default to true if active is undefined
    const currentActive = item.active ?? true;
    const newActive = !currentActive;

    await ctx.db.patch(args.id, {
      active: newActive,
      updatedAt: Date.now(),
    });

    return { id: args.id, active: newActive };
  },
});

// Migration: Add active field to all items that don't have it
// This should be run once to fix existing items
export const migrateAddActiveField = mutation({
  handler: async (ctx) => {
    const items = await ctx.db.query("items").collect();
    let updatedCount = 0;

    for (const item of items) {
      // TypeScript might not know about missing fields, so we check at runtime
      if (!("active" in item) || item.active === undefined) {
        await ctx.db.patch(item._id, {
          active: true, // Default to active
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      message: `Updated ${updatedCount} items with active field`,
      updatedCount,
      totalItems: items.length,
    };
  },
});

// Migration: Fix pasta tomate items and azúcar sharedAreas
// Corrects product names and area assignments
export const migrateFixProductNames = mutation({
  handler: async (ctx) => {
    const items = await ctx.db.query("items").collect();
    let updatedCount = 0;
    const updates: Array<{ id: string; changes: string[] }> = [];

    for (const item of items) {
      const changes: string[] = [];

      // Fix "Pasta tomate Pafia" -> "Pasta tomate"
      if (item.nombre === "Pasta tomate Pafia") {
        await ctx.db.patch(item._id, {
          nombre: "Pasta tomate",
          sharedAreas: ["Cocina"],
        });
        changes.push("nombre corrected, sharedAreas set to Cocina");
        updatedCount++;
      }

      // Fix "Pasta tomate Coma" -> "Pasta tomate"
      if (item.nombre === "Pasta tomate Coma") {
        await ctx.db.patch(item._id, {
          nombre: "Pasta tomate",
          sharedAreas: ["Cocina"],
        });
        changes.push("nombre corrected, sharedAreas set to Cocina");
        updatedCount++;
      }

      // Fix Azúcar to be shared between Cocina and Cafetín
      if (item.nombre === "Azúcar" && item.categoria === "Cocina") {
        await ctx.db.patch(item._id, {
          sharedAreas: ["Cocina", "Cafetín"],
        });
        changes.push("sharedAreas set to Cocina and Cafetín");
        updatedCount++;
      }

      if (changes.length > 0) {
        updates.push({ id: item._id, changes });
      }
    }

    return {
      success: true,
      message: `Updated ${updatedCount} items with corrected names and sharedAreas`,
      updatedCount,
      totalItems: items.length,
      updates,
    };
  },
});
