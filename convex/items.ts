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
  },
  handler: async (ctx, args) => {
    if (args.stock_actual < 0) {
      throw new Error("El stock no puede ser negativo");
    }

    const status = calculateStatus(args.stock_actual, args.stock_minimo);

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
    });

    return itemId;
  },
});
