import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Query: Get all activos
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("activos").collect();
  },
});

// Query: Get activo by ID
export const getById = query({
  args: { id: v.id("activos") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Query: Get activos by estado
export const getByEstado = query({
  args: { estado: v.union(v.literal("operativo"), v.literal("en_reparacion"), v.literal("fuera_servicio")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activos")
      .withIndex("by_estado", (q) => q.eq("estado", args.estado))
      .collect();
  },
});

// Query: Get activos by tipo
export const getByTipo = query({
  args: { tipo: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activos")
      .withIndex("by_tipo", (q) => q.eq("tipo", args.tipo))
      .collect();
  },
});

// Mutation: Create a new activo
export const create = mutation({
  args: {
    nombre: v.string(),
    tipo: v.string(),
    ubicacion: v.string(),
    estado: v.optional(v.union(v.literal("operativo"), v.literal("en_reparacion"), v.literal("fuera_servicio"))),
    descripcion: v.optional(v.string()),
    fecha_instalacion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const activoId = await ctx.db.insert("activos", {
      nombre: args.nombre,
      tipo: args.tipo,
      ubicacion: args.ubicacion,
      estado: args.estado || "operativo",
      descripcion: args.descripcion,
      fecha_instalacion: args.fecha_instalacion,
      createdAt: now,
      updatedAt: now,
    });

    return activoId;
  },
});

// Mutation: Update activo
export const update = mutation({
  args: {
    id: v.id("activos"),
    nombre: v.optional(v.string()),
    tipo: v.optional(v.string()),
    ubicacion: v.optional(v.string()),
    estado: v.optional(v.union(v.literal("operativo"), v.literal("en_reparacion"), v.literal("fuera_servicio"))),
    descripcion: v.optional(v.string()),
    fecha_instalacion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const activo = await ctx.db.get(id);
    if (!activo) {
      throw new Error(`Activo con ID ${id} no encontrado`);
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { id };
  },
});

// Mutation: Update estado only
export const updateEstado = mutation({
  args: {
    id: v.id("activos"),
    estado: v.union(v.literal("operativo"), v.literal("en_reparacion"), v.literal("fuera_servicio")),
  },
  handler: async (ctx, args) => {
    const activo = await ctx.db.get(args.id);
    if (!activo) {
      throw new Error(`Activo con ID ${args.id} no encontrado`);
    }

    await ctx.db.patch(args.id, {
      estado: args.estado,
      updatedAt: Date.now(),
    });

    return { id: args.id, estado: args.estado };
  },
});
