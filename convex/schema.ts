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

  // ============================================================
  // NEW INVENTORY SYSTEM (Multi-location with unit conversion)
  // ============================================================

  // 1. CATALOGO MAESTRO: Atributos que no cambian según la ubicación
  products: defineTable({
    name: v.string(),              // Ej: "Coca Cola 350ml"
    brand: v.string(),             // Ej: "Coca Cola"
    category: v.string(),          // Ej: "Bebidas"
    subCategory: v.optional(v.string()),

    // LOGICA DE UNIDADES
    baseUnit: v.string(),          // Siempre la unidad de consumo (unidad, gr, ml)
    purchaseUnit: v.string(),      // Cómo lo compras (caja, fardo, saco)
    conversionFactor: v.number(),  // Cuántas baseUnits hay en una purchaseUnit (ej: 24)

    packageSize: v.number(),       // Peso/Volumen unitario (ej: 350)
    active: v.boolean(),

    // Reference to original item for migration tracking
    legacyItemId: v.optional(v.id("items")),
  })
    .index("by_name", ["name"])
    .index("by_category", ["category"])
    .index("by_legacy_item", ["legacyItemId"]),

  // 2. STOCK ACTUAL: Cuánto hay y dónde
  inventory: defineTable({
    productId: v.id("products"),
    location: v.union(v.literal("almacen"), v.literal("cafetin")),
    stockActual: v.number(),       // SIEMPRE expresado en baseUnit
    stockMinimo: v.number(),       // Alerta de reorden
    updatedAt: v.number(),
  })
    .index("by_location", ["location"])
    .index("by_product_location", ["productId", "location"]),

  // 3. MOVIMIENTOS (AUDITORIA): El historial de qué pasó
  movements: defineTable({
    productId: v.id("products"),
    type: v.union(
      v.literal("COMPRA"),         // Entrada de proveedor
      v.literal("TRASLADO"),       // Almacén -> Cafetín
      v.literal("CONSUMO"),        // Uso en cafetín o venta
      v.literal("AJUSTE")          // Corrección manual (merma/error)
    ),
    from: v.optional(v.string()),  // "PROVEEDOR" o "ALMACEN"
    to: v.string(),                // "ALMACEN" o "CAFETIN"
    quantity: v.number(),          // Siempre en baseUnit
    prevStock: v.number(),         // Stock antes del movimiento
    nextStock: v.number(),         // Stock después del movimiento
    user: v.string(),              // Quién lo hizo
    timestamp: v.number(),

    // Reference to original movement for migration tracking
    legacyMovementId: v.optional(v.id("stock_movements")),
  })
    .index("by_product", ["productId"])
    .index("by_type", ["type"])
    .index("by_timestamp", ["timestamp"])
    .index("by_legacy_movement", ["legacyMovementId"]),
});
