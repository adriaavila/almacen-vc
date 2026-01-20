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
    .index("by_area_status", ["area", "status"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    itemId: v.id("items"),
    cantidad: v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_itemId", ["itemId"]),
});
