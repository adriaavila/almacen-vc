import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Helper function to calculate status based on stock
function calculateStatus(
  stock_actual: number,
  stock_minimo: number
): "ok" | "bajo_stock" {
  return stock_actual <= stock_minimo ? "bajo_stock" : "ok";
}

// Query: Get all repuestos
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("repuestos").collect();
  },
});

// Query: Get repuesto by ID
export const getById = query({
  args: { id: v.id("repuestos") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Query: Get repuestos by status
export const getByStatus = query({
  args: { status: v.union(v.literal("ok"), v.literal("bajo_stock")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repuestos")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
  },
});

// Query: Get repuestos by categoria
export const getByCategoria = query({
  args: { categoria: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repuestos")
      .withIndex("by_categoria", (q) => q.eq("categoria", args.categoria))
      .collect();
  },
});

// Query: Get repuestos by activo
export const getByActivo = query({
  args: { activoId: v.id("activos") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repuestos")
      .withIndex("by_activo", (q) => q.eq("activo_id", args.activoId))
      .collect();
  },
});

// Query: Get repuestos with low stock
export const getLowStock = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("repuestos")
      .withIndex("by_status", (q) => q.eq("status", "bajo_stock"))
      .collect();
  },
});

// Mutation: Create a new repuesto
export const create = mutation({
  args: {
    nombre: v.string(),
    categoria: v.string(),
    marca: v.optional(v.string()),
    unidad: v.string(),
    stock_actual: v.number(),
    stock_minimo: v.number(),
    ubicacion: v.string(),
    descripcion: v.optional(v.string()),
    activo_id: v.optional(v.id("activos")),
  },
  handler: async (ctx, args) => {
    if (args.stock_actual < 0) {
      throw new Error("El stock no puede ser negativo");
    }

    const status = calculateStatus(args.stock_actual, args.stock_minimo);
    const now = Date.now();

    const repuestoId = await ctx.db.insert("repuestos", {
      nombre: args.nombre,
      categoria: args.categoria,
      marca: args.marca,
      unidad: args.unidad,
      stock_actual: args.stock_actual,
      stock_minimo: args.stock_minimo,
      ubicacion: args.ubicacion,
      descripcion: args.descripcion,
      activo_id: args.activo_id,
      status,
      createdAt: now,
      updatedAt: now,
    });

    return repuestoId;
  },
});

// Mutation: Update repuesto
export const update = mutation({
  args: {
    id: v.id("repuestos"),
    nombre: v.optional(v.string()),
    categoria: v.optional(v.string()),
    marca: v.optional(v.string()),
    unidad: v.optional(v.string()),
    stock_actual: v.optional(v.number()),
    stock_minimo: v.optional(v.number()),
    ubicacion: v.optional(v.string()),
    descripcion: v.optional(v.string()),
    activo_id: v.optional(v.id("activos")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const repuesto = await ctx.db.get(id);
    if (!repuesto) {
      throw new Error(`Repuesto con ID ${id} no encontrado`);
    }

    // Calculate status if stock fields are being updated
    let status = repuesto.status;
    const stock_actual = updates.stock_actual ?? repuesto.stock_actual;
    const stock_minimo = updates.stock_minimo ?? repuesto.stock_minimo;
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

// Mutation: Decrement stock (used when consuming repuestos)
export const decrementStock = mutation({
  args: {
    id: v.id("repuestos"),
    cantidad: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.cantidad <= 0) {
      throw new Error("La cantidad debe ser mayor a 0");
    }

    const repuesto = await ctx.db.get(args.id);
    if (!repuesto) {
      throw new Error(`Repuesto con ID ${args.id} no encontrado`);
    }

    const newStock = Math.max(0, repuesto.stock_actual - args.cantidad);
    const status = calculateStatus(newStock, repuesto.stock_minimo);

    await ctx.db.patch(args.id, {
      stock_actual: newStock,
      status,
      updatedAt: Date.now(),
    });

    return {
      id: args.id,
      stock_actual: newStock,
      status,
      wasLowStock: newStock <= repuesto.stock_minimo,
    };
  },
});

// Mutation: Increment stock (for ingresos)
export const incrementStock = mutation({
  args: {
    id: v.id("repuestos"),
    cantidad: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.cantidad <= 0) {
      throw new Error("La cantidad debe ser mayor a 0");
    }

    const repuesto = await ctx.db.get(args.id);
    if (!repuesto) {
      throw new Error(`Repuesto con ID ${args.id} no encontrado`);
    }

    const newStock = repuesto.stock_actual + args.cantidad;
    const status = calculateStatus(newStock, repuesto.stock_minimo);

    await ctx.db.patch(args.id, {
      stock_actual: newStock,
      status,
      updatedAt: Date.now(),
    });

    return {
      id: args.id,
      stock_actual: newStock,
      status,
    };
  },
});
