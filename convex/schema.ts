import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  items: defineTable({
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
    status: v.union(v.literal("ok"), v.literal("bajo_stock")),
    active: v.optional(v.boolean()), // Optional to support existing items without this field
    sharedAreas: v.optional(v.array(v.string())), // Areas that can see this item: ["Cocina", "Cafetín", "Limpieza"]
    updatedBy: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_categoria", ["categoria"]),

  orders: defineTable({
    area: v.union(v.literal("Cocina"), v.literal("Cafetín"), v.literal("Limpieza")),
    status: v.union(v.literal("pendiente"), v.literal("entregado")),
    createdAt: v.number(), // Timestamp
  })
    .index("by_status", ["status"])
    .index("by_area", ["area"])
    .index("by_area_status", ["area", "status"])
    .index("by_status_createdAt", ["status", "createdAt"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    itemId: v.id("items"),
    cantidad: v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_itemId", ["itemId"]),

  stock_movements: defineTable({
    itemId: v.id("items"),
    type: v.union(v.literal("ingreso"), v.literal("egreso")),
    cantidad: v.number(),
    motivo: v.union(v.literal("compra"), v.literal("consumo"), v.literal("ajuste"), v.literal("mantenimiento")),
    referencia: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.optional(v.string()),
  })
    .index("by_itemId", ["itemId"])
    .index("by_type", ["type"])
    .index("by_itemId_createdAt", ["itemId", "createdAt"])
    .index("by_createdAt", ["createdAt"]),

  activos: defineTable({
    nombre: v.string(),
    tipo: v.string(),
    ubicacion: v.string(),
    estado: v.union(v.literal("operativo"), v.literal("en_reparacion"), v.literal("fuera_servicio")),
    descripcion: v.optional(v.string()),
    fecha_instalacion: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_estado", ["estado"])
    .index("by_tipo", ["tipo"]),

  repuestos: defineTable({
    nombre: v.string(),
    categoria: v.string(),
    marca: v.optional(v.string()),
    unidad: v.string(),
    stock_actual: v.number(),
    stock_minimo: v.number(),
    ubicacion: v.string(),
    descripcion: v.optional(v.string()),
    activo_id: v.optional(v.id("activos")),
    status: v.union(v.literal("ok"), v.literal("bajo_stock")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_categoria", ["categoria"])
    .index("by_activo", ["activo_id"]),

  trabajos_mantenimiento: defineTable({
    activo_id: v.id("activos"),
    tipo: v.union(v.literal("preventivo"), v.literal("correctivo"), v.literal("emergencia")),
    descripcion: v.string(),
    estado: v.union(v.literal("pendiente"), v.literal("en_proceso"), v.literal("completado")),
    fecha_inicio: v.optional(v.number()),
    fecha_fin: v.optional(v.number()),
    tecnico: v.optional(v.string()),
    observaciones: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_activo", ["activo_id"])
    .index("by_estado", ["estado"])
    .index("by_tipo", ["tipo"]),

  consumo_repuestos: defineTable({
    trabajo_id: v.id("trabajos_mantenimiento"),
    repuesto_id: v.id("repuestos"),
    cantidad: v.number(),
    createdAt: v.number(),
  })
    .index("by_trabajo", ["trabajo_id"])
    .index("by_repuesto", ["repuesto_id"]),

  ui_config: defineTable({
    userId: v.string(),
    page: v.string(),
    config: v.object({
      columns: v.array(
        v.object({
          key: v.string(),
          label: v.string(),
          visible: v.boolean(),
          order: v.number(),
        })
      ),
      showOnlyActive: v.boolean(),
    }),
  }).index("by_user_page", ["userId", "page"]),
});
