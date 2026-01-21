import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Query: Get all trabajos
export const list = query({
  handler: async (ctx) => {
    const trabajos = await ctx.db.query("trabajos_mantenimiento").collect();
    
    // Populate activos
    const trabajosWithActivos = await Promise.all(
      trabajos.map(async (trabajo) => {
        const activo = await ctx.db.get(trabajo.activo_id);
        return {
          ...trabajo,
          activo: activo || undefined,
        };
      })
    );

    return trabajosWithActivos;
  },
});

// Query: Get trabajo by ID
export const getById = query({
  args: { id: v.id("trabajos_mantenimiento") },
  handler: async (ctx, args) => {
    const trabajo = await ctx.db.get(args.id);
    if (!trabajo) return null;

    // Populate activo
    const activo = await ctx.db.get(trabajo.activo_id);

    // Populate repuestos consumed
    const consumos = await ctx.db
      .query("consumo_repuestos")
      .withIndex("by_trabajo", (q) => q.eq("trabajo_id", args.id))
      .collect();

    const repuestos = await Promise.all(
      consumos.map(async (consumo) => {
        const repuesto = await ctx.db.get(consumo.repuesto_id);
        return {
          repuesto: repuesto || undefined,
          cantidad: consumo.cantidad,
        };
      })
    );

    return {
      ...trabajo,
      activo: activo || undefined,
      repuestos,
    };
  },
});

// Query: Get trabajos by activo
export const getByActivo = query({
  args: { activoId: v.id("activos") },
  handler: async (ctx, args) => {
    const trabajos = await ctx.db
      .query("trabajos_mantenimiento")
      .withIndex("by_activo", (q) => q.eq("activo_id", args.activoId))
      .collect();

    // Populate activo
    const activo = await ctx.db.get(args.activoId);

    return trabajos.map((trabajo) => ({
      ...trabajo,
      activo: activo || undefined,
    }));
  },
});

// Query: Get trabajos by estado
export const getByEstado = query({
  args: { estado: v.union(v.literal("pendiente"), v.literal("en_proceso"), v.literal("completado")) },
  handler: async (ctx, args) => {
    const trabajos = await ctx.db
      .query("trabajos_mantenimiento")
      .withIndex("by_estado", (q) => q.eq("estado", args.estado))
      .collect();

    // Populate activos
    const trabajosWithActivos = await Promise.all(
      trabajos.map(async (trabajo) => {
        const activo = await ctx.db.get(trabajo.activo_id);
        return {
          ...trabajo,
          activo: activo || undefined,
        };
      })
    );

    return trabajosWithActivos;
  },
});

// Query: Get pendientes
export const getPendientes = query({
  handler: async (ctx) => {
    const trabajos = await ctx.db
      .query("trabajos_mantenimiento")
      .withIndex("by_estado", (q) => q.eq("estado", "pendiente"))
      .collect();

    // Populate activos
    const trabajosWithActivos = await Promise.all(
      trabajos.map(async (trabajo) => {
        const activo = await ctx.db.get(trabajo.activo_id);
        return {
          ...trabajo,
          activo: activo || undefined,
        };
      })
    );

    return trabajosWithActivos;
  },
});

// Mutation: Create trabajo
export const create = mutation({
  args: {
    activo_id: v.id("activos"),
    tipo: v.union(v.literal("preventivo"), v.literal("correctivo"), v.literal("emergencia")),
    descripcion: v.string(),
    tecnico: v.optional(v.string()),
    observaciones: v.optional(v.string()),
    repuestos: v.optional(
      v.array(
        v.object({
          repuesto_id: v.id("repuestos"),
          cantidad: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // Validate activo exists
    const activo = await ctx.db.get(args.activo_id);
    if (!activo) {
      throw new Error("Activo no encontrado");
    }

    const now = Date.now();

    // Create trabajo
    const trabajoId = await ctx.db.insert("trabajos_mantenimiento", {
      activo_id: args.activo_id,
      tipo: args.tipo,
      descripcion: args.descripcion,
      estado: "pendiente",
      tecnico: args.tecnico,
      observaciones: args.observaciones,
      createdAt: now,
      updatedAt: now,
    });

    // Consume repuestos if provided
    if (args.repuestos && args.repuestos.length > 0) {
      for (const repuestoConsumo of args.repuestos) {
        // Validate repuesto exists and has enough stock
        const repuesto = await ctx.db.get(repuestoConsumo.repuesto_id);
        if (!repuesto) {
          throw new Error(`Repuesto con ID ${repuestoConsumo.repuesto_id} no encontrado`);
        }

        if (repuesto.stock_actual < repuestoConsumo.cantidad) {
          throw new Error(
            `Stock insuficiente para ${repuesto.nombre}. Disponible: ${repuesto.stock_actual}, Requerido: ${repuestoConsumo.cantidad}`
          );
        }

        // Create consumo record
        await ctx.db.insert("consumo_repuestos", {
          trabajo_id: trabajoId,
          repuesto_id: repuestoConsumo.repuesto_id,
          cantidad: repuestoConsumo.cantidad,
          createdAt: now,
        });

        // Decrement stock
        const newStock = repuesto.stock_actual - repuestoConsumo.cantidad;
        const status = newStock <= repuesto.stock_minimo ? "bajo_stock" : "ok";

        await ctx.db.patch(repuestoConsumo.repuesto_id, {
          stock_actual: newStock,
          status,
          updatedAt: now,
        });

        // Create stock movement for repuesto (egreso con motivo mantenimiento)
        // Note: This uses items table, but repuestos are separate
        // We might want to create a separate movement table for repuestos later
        // For now, we'll skip this to avoid confusion
      }
    }

    return trabajoId;
  },
});

// Mutation: Update trabajo
export const update = mutation({
  args: {
    id: v.id("trabajos_mantenimiento"),
    descripcion: v.optional(v.string()),
    estado: v.optional(v.union(v.literal("pendiente"), v.literal("en_proceso"), v.literal("completado"))),
    tecnico: v.optional(v.string()),
    observaciones: v.optional(v.string()),
    fecha_inicio: v.optional(v.number()),
    fecha_fin: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const trabajo = await ctx.db.get(id);
    if (!trabajo) {
      throw new Error(`Trabajo con ID ${id} no encontrado`);
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { id };
  },
});

// Mutation: Completar trabajo
export const completar = mutation({
  args: {
    id: v.id("trabajos_mantenimiento"),
    observaciones: v.optional(v.string()),
    nuevoEstadoActivo: v.optional(v.union(v.literal("operativo"), v.literal("en_reparacion"), v.literal("fuera_servicio"))),
  },
  handler: async (ctx, args) => {
    const trabajo = await ctx.db.get(args.id);
    if (!trabajo) {
      throw new Error(`Trabajo con ID ${args.id} no encontrado`);
    }

    const now = Date.now();

    // Update trabajo
    await ctx.db.patch(args.id, {
      estado: "completado",
      fecha_fin: trabajo.fecha_fin || now,
      observaciones: args.observaciones || trabajo.observaciones,
      updatedAt: now,
    });

    // Update activo estado if provided
    if (args.nuevoEstadoActivo) {
      await ctx.db.patch(trabajo.activo_id, {
        estado: args.nuevoEstadoActivo,
        updatedAt: now,
      });
    } else {
      // Default: set activo to operativo if it was in reparacion
      const activo = await ctx.db.get(trabajo.activo_id);
      if (activo && activo.estado === "en_reparacion") {
        await ctx.db.patch(trabajo.activo_id, {
          estado: "operativo",
          updatedAt: now,
        });
      }
    }

    return { id: args.id };
  },
});

// Mutation: Consumir repuestos adicionales (after trabajo is created)
export const consumirRepuestos = mutation({
  args: {
    trabajo_id: v.id("trabajos_mantenimiento"),
    repuestos: v.array(
      v.object({
        repuesto_id: v.id("repuestos"),
        cantidad: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Validate trabajo exists
    const trabajo = await ctx.db.get(args.trabajo_id);
    if (!trabajo) {
      throw new Error("Trabajo no encontrado");
    }

    const now = Date.now();

    for (const repuestoConsumo of args.repuestos) {
      // Validate repuesto exists and has enough stock
      const repuesto = await ctx.db.get(repuestoConsumo.repuesto_id);
      if (!repuesto) {
        throw new Error(`Repuesto con ID ${repuestoConsumo.repuesto_id} no encontrado`);
      }

      if (repuesto.stock_actual < repuestoConsumo.cantidad) {
        throw new Error(
          `Stock insuficiente para ${repuesto.nombre}. Disponible: ${repuesto.stock_actual}, Requerido: ${repuestoConsumo.cantidad}`
        );
      }

      // Create consumo record
      await ctx.db.insert("consumo_repuestos", {
        trabajo_id: args.trabajo_id,
        repuesto_id: repuestoConsumo.repuesto_id,
        cantidad: repuestoConsumo.cantidad,
        createdAt: now,
      });

      // Decrement stock
      const newStock = repuesto.stock_actual - repuestoConsumo.cantidad;
      const status = newStock <= repuesto.stock_minimo ? "bajo_stock" : "ok";

      await ctx.db.patch(repuestoConsumo.repuesto_id, {
        stock_actual: newStock,
        status,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
