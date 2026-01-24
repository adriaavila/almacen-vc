import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// QUERIES
// ============================================================

// Get all movements
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    const movements = await ctx.db
      .query("movements")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    // Populate product info
    const movementsWithProducts = await Promise.all(
      movements.map(async (mov) => {
        const product = await ctx.db.get(mov.productId);
        return {
          ...mov,
          product: product || undefined,
        };
      })
    );

    return movementsWithProducts;
  },
});

// Get movements by product
export const getByProduct = query({
  args: {
    productId: v.id("products"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const movements = await ctx.db
      .query("movements")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .take(limit);

    return movements;
  },
});

// Get movements by type
export const getByType = query({
  args: {
    type: v.union(
      v.literal("COMPRA"),
      v.literal("TRASLADO"),
      v.literal("CONSUMO"),
      v.literal("AJUSTE")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const movements = await ctx.db
      .query("movements")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .order("desc")
      .take(limit);

    // Populate product info
    const movementsWithProducts = await Promise.all(
      movements.map(async (mov) => {
        const product = await ctx.db.get(mov.productId);
        return {
          ...mov,
          product: product || undefined,
        };
      })
    );

    return movementsWithProducts;
  },
});

// Get recent movements (for dashboard)
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const movements = await ctx.db
      .query("movements")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    // Populate product info
    const movementsWithProducts = await Promise.all(
      movements.map(async (mov) => {
        const product = await ctx.db.get(mov.productId);
        return {
          ...mov,
          product: product || undefined,
        };
      })
    );

    return movementsWithProducts;
  },
});

// Get movements by date range
export const getByDateRange = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    type: v.optional(
      v.union(
        v.literal("COMPRA"),
        v.literal("TRASLADO"),
        v.literal("CONSUMO"),
        v.literal("AJUSTE")
      )
    ),
  },
  handler: async (ctx, args) => {
    let movements;

    if (args.type) {
      movements = await ctx.db
        .query("movements")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .collect();
    } else {
      movements = await ctx.db.query("movements").collect();
    }

    // Filter by date range
    const filtered = movements.filter(
      (m) => m.timestamp >= args.startDate && m.timestamp <= args.endDate
    );

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    // Populate product info
    const movementsWithProducts = await Promise.all(
      filtered.map(async (mov) => {
        const product = await ctx.db.get(mov.productId);
        return {
          ...mov,
          product: product || undefined,
        };
      })
    );

    return movementsWithProducts;
  },
});

// Get movement stats
export const getStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let movements = await ctx.db.query("movements").collect();

    // Filter by date range if provided
    if (args.startDate !== undefined || args.endDate !== undefined) {
      movements = movements.filter((m) => {
        if (args.startDate !== undefined && m.timestamp < args.startDate) {
          return false;
        }
        if (args.endDate !== undefined && m.timestamp > args.endDate) {
          return false;
        }
        return true;
      });
    }

    const stats = {
      total: movements.length,
      byType: {
        COMPRA: 0,
        TRASLADO: 0,
        CONSUMO: 0,
        AJUSTE: 0,
      },
      totalQuantity: {
        COMPRA: 0,
        TRASLADO: 0,
        CONSUMO: 0,
        AJUSTE: 0,
      },
    };

    for (const mov of movements) {
      stats.byType[mov.type]++;
      stats.totalQuantity[mov.type] += mov.quantity;
    }

    return stats;
  },
});

// ============================================================
// MUTATIONS
// ============================================================

// Register a COMPRA (purchase from supplier)
export const registerCompra = mutation({
  args: {
    productId: v.id("products"),
    location: v.union(v.literal("almacen"), v.literal("cafetin")),
    quantity: v.number(),
    user: v.string(),
    inPurchaseUnits: v.optional(v.boolean()), // If true, multiply by conversionFactor
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new Error("La cantidad debe ser mayor a 0");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Producto no encontrado");
    }

    // Calculate quantity in base units
    let quantityInBaseUnits = args.quantity;
    if (args.inPurchaseUnits) {
      quantityInBaseUnits = args.quantity * product.conversionFactor;
    }

    // Get or create inventory
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q.eq("productId", args.productId).eq("location", args.location)
      )
      .first();

    const now = Date.now();
    const prevStock = inventory?.stockActual || 0;
    const newStock = prevStock + quantityInBaseUnits;

    if (inventory) {
      await ctx.db.patch(inventory._id, {
        stockActual: newStock,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("inventory", {
        productId: args.productId,
        location: args.location,
        stockActual: newStock,
        stockMinimo: 0,
        updatedAt: now,
      });
    }

    // Create movement record
    const movementId = await ctx.db.insert("movements", {
      productId: args.productId,
      type: "COMPRA",
      from: "PROVEEDOR",
      to: args.location.toUpperCase(),
      quantity: quantityInBaseUnits,
      prevStock,
      nextStock: newStock,
      user: args.user,
      timestamp: now,
    });

    return {
      movementId,
      productId: args.productId,
      location: args.location,
      quantity: quantityInBaseUnits,
      prevStock,
      newStock,
    };
  },
});

// Register a CONSUMO (usage/sale)
export const registerConsumo = mutation({
  args: {
    productId: v.id("products"),
    location: v.union(v.literal("almacen"), v.literal("cafetin")),
    quantity: v.number(),
    user: v.string(),
    destination: v.optional(v.string()), // e.g., "COCINA", "VENTA", "MANTENIMIENTO"
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new Error("La cantidad debe ser mayor a 0");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Producto no encontrado");
    }

    // Get inventory
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q.eq("productId", args.productId).eq("location", args.location)
      )
      .first();

    if (!inventory || inventory.stockActual < args.quantity) {
      throw new Error(
        `Stock insuficiente en ${args.location}. Disponible: ${inventory?.stockActual || 0}`
      );
    }

    const now = Date.now();
    const prevStock = inventory.stockActual;
    const newStock = prevStock - args.quantity;

    // Update inventory
    await ctx.db.patch(inventory._id, {
      stockActual: newStock,
      updatedAt: now,
    });

    // Create movement record
    const movementId = await ctx.db.insert("movements", {
      productId: args.productId,
      type: "CONSUMO",
      from: args.location.toUpperCase(),
      to: args.destination || "USO",
      quantity: args.quantity,
      prevStock,
      nextStock: newStock,
      user: args.user,
      timestamp: now,
    });

    return {
      movementId,
      productId: args.productId,
      location: args.location,
      quantity: args.quantity,
      prevStock,
      newStock,
      lowStock: newStock <= inventory.stockMinimo,
    };
  },
});

// Register a TRASLADO (transfer between locations)
export const registerTraslado = mutation({
  args: {
    productId: v.id("products"),
    from: v.union(v.literal("almacen"), v.literal("cafetin")),
    to: v.union(v.literal("almacen"), v.literal("cafetin")),
    quantity: v.number(),
    user: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.from === args.to) {
      throw new Error("La ubicación de origen y destino deben ser diferentes");
    }

    if (args.quantity <= 0) {
      throw new Error("La cantidad debe ser mayor a 0");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Producto no encontrado");
    }

    // Get source inventory
    const sourceInventory = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q.eq("productId", args.productId).eq("location", args.from)
      )
      .first();

    if (!sourceInventory || sourceInventory.stockActual < args.quantity) {
      throw new Error(
        `Stock insuficiente en ${args.from}. Disponible: ${sourceInventory?.stockActual || 0}`
      );
    }

    // Get or create destination inventory
    const destInventory = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q.eq("productId", args.productId).eq("location", args.to)
      )
      .first();

    const now = Date.now();
    const prevSourceStock = sourceInventory.stockActual;
    const prevDestStock = destInventory?.stockActual || 0;
    const newSourceStock = prevSourceStock - args.quantity;
    const newDestStock = prevDestStock + args.quantity;

    // Update source
    await ctx.db.patch(sourceInventory._id, {
      stockActual: newSourceStock,
      updatedAt: now,
    });

    // Update or create destination
    if (destInventory) {
      await ctx.db.patch(destInventory._id, {
        stockActual: newDestStock,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("inventory", {
        productId: args.productId,
        location: args.to,
        stockActual: newDestStock,
        stockMinimo: 0,
        updatedAt: now,
      });
    }

    // Create movement record
    const movementId = await ctx.db.insert("movements", {
      productId: args.productId,
      type: "TRASLADO",
      from: args.from.toUpperCase(),
      to: args.to.toUpperCase(),
      quantity: args.quantity,
      prevStock: prevSourceStock,
      nextStock: newSourceStock,
      user: args.user,
      timestamp: now,
    });

    return {
      movementId,
      productId: args.productId,
      from: args.from,
      to: args.to,
      quantity: args.quantity,
      sourceStock: { prev: prevSourceStock, new: newSourceStock },
      destStock: { prev: prevDestStock, new: newDestStock },
    };
  },
});

// Register an AJUSTE (manual correction)
export const registerAjuste = mutation({
  args: {
    productId: v.id("products"),
    location: v.union(v.literal("almacen"), v.literal("cafetin")),
    newStock: v.number(),
    user: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.newStock < 0) {
      throw new Error("El stock no puede ser negativo");
    }

    if (!args.reason || args.reason.trim() === "") {
      throw new Error("La razón del ajuste es obligatoria");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Producto no encontrado");
    }

    // Get or create inventory
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q.eq("productId", args.productId).eq("location", args.location)
      )
      .first();

    const now = Date.now();
    const prevStock = inventory?.stockActual || 0;
    const difference = args.newStock - prevStock;

    if (inventory) {
      await ctx.db.patch(inventory._id, {
        stockActual: args.newStock,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("inventory", {
        productId: args.productId,
        location: args.location,
        stockActual: args.newStock,
        stockMinimo: 0,
        updatedAt: now,
      });
    }

    // Create movement record
    const movementId = await ctx.db.insert("movements", {
      productId: args.productId,
      type: "AJUSTE",
      from: difference < 0 ? args.location.toUpperCase() : undefined,
      to: `AJUSTE: ${args.reason}`,
      quantity: Math.abs(difference),
      prevStock,
      nextStock: args.newStock,
      user: args.user,
      timestamp: now,
    });

    return {
      movementId,
      productId: args.productId,
      location: args.location,
      prevStock,
      newStock: args.newStock,
      difference,
    };
  },
});

// Migration: Update existing movements from CONSUMIDO to USO
export const updateConsumidoToUso = mutation({
  handler: async (ctx) => {
    // Get all movements with "CONSUMIDO" as destination
    const movements = await ctx.db
      .query("movements")
      .filter((q) => q.eq(q.field("to"), "CONSUMIDO"))
      .collect();

    let updated = 0;
    for (const movement of movements) {
      await ctx.db.patch(movement._id, {
        to: "USO",
      });
      updated++;
    }

    return {
      updated,
      total: movements.length,
    };
  },
});
