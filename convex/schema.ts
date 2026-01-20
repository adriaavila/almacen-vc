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
    active: v.boolean(),
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
    motivo: v.union(v.literal("compra"), v.literal("consumo"), v.literal("ajuste")),
    referencia: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.optional(v.string()),
  })
    .index("by_itemId", ["itemId"])
    .index("by_type", ["type"])
    .index("by_itemId_createdAt", ["itemId", "createdAt"])
    .index("by_createdAt", ["createdAt"]),

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
