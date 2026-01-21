import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper function to calculate status based on stock
function calculateStatus(
  stock_actual: number,
  stock_minimo: number
): "ok" | "bajo_stock" {
  return stock_actual <= stock_minimo ? "bajo_stock" : "ok";
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

// Query: Get items with low stock
export const getLowStock = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("items")
      .withIndex("by_status", (q) => q.eq("status", "bajo_stock"))
      .collect();
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
