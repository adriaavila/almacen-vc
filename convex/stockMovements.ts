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

// Query: Get recent stock movements with items populated
export const getRecentStockMovements = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    // Get all movements, sort by createdAt descending, then take limit
    const allMovements = await ctx.db
      .query("stock_movements")
      .collect();
    
    // Sort by createdAt descending and take limit
    const movements = allMovements
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    // Populate items
    const movementsWithItems = await Promise.all(
      movements.map(async (movement) => {
        const item = await ctx.db.get(movement.itemId);
        return {
          ...movement,
          item: item || undefined,
        };
      })
    );

    return movementsWithItems;
  },
});

// Query: Get all movements for a specific item
export const getMovementsByItem = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const movements = await ctx.db
      .query("stock_movements")
      .withIndex("by_itemId_createdAt", (q) => q.eq("itemId", args.itemId))
      .order("desc")
      .collect();

    // Populate item (already known, but for consistency)
    const item = await ctx.db.get(args.itemId);

    return movements.map((movement) => ({
      ...movement,
      item: item || undefined,
    }));
  },
});

// Query: Get ingresos by date range
export const getIngresosByDateRange = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let movements = await ctx.db
      .query("stock_movements")
      .withIndex("by_type", (q) => q.eq("type", "ingreso"))
      .collect();

    // Filter by date range if provided
    if (args.startDate !== undefined || args.endDate !== undefined) {
      movements = movements.filter((movement) => {
        if (args.startDate !== undefined && movement.createdAt < args.startDate) {
          return false;
        }
        if (args.endDate !== undefined && movement.createdAt > args.endDate) {
          return false;
        }
        return true;
      });
    }

    // Sort by date descending
    movements.sort((a, b) => b.createdAt - a.createdAt);

    // Populate items
    const movementsWithItems = await Promise.all(
      movements.map(async (movement) => {
        const item = await ctx.db.get(movement.itemId);
        return {
          ...movement,
          item: item || undefined,
        };
      })
    );

    return movementsWithItems;
  },
});

// Mutation: Register an ingreso (stock entry)
export const registerIngreso = mutation({
  args: {
    itemId: v.id("items"),
    cantidad: v.number(),
    motivo: v.optional(v.union(v.literal("compra"), v.literal("ajuste"))),
    referencia: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate cantidad > 0
    if (args.cantidad <= 0) {
      throw new Error("La cantidad debe ser mayor a 0");
    }

    // Verify item exists
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item no encontrado");
    }

    // Create stock movement
    const movementId = await ctx.db.insert("stock_movements", {
      itemId: args.itemId,
      type: "ingreso",
      cantidad: args.cantidad,
      motivo: args.motivo || "compra",
      referencia: args.referencia,
      createdAt: Date.now(),
      createdBy: undefined, // TODO: Add when auth is implemented
    });

    // Increment stock
    const newStock = item.stock_actual + args.cantidad;
    const status = calculateStatus(newStock, item.stock_minimo);

    await ctx.db.patch(args.itemId, {
      stock_actual: newStock,
      status,
    });

    // Get the created movement
    const movement = await ctx.db.get(movementId);

    return {
      movement,
      newStock,
      status,
    };
  },
});

// Optional Mutation: Adjust stock (ingreso or egreso)
export const adjustStock = mutation({
  args: {
    itemId: v.id("items"),
    cantidad: v.number(), // Positive = ingreso, negative = egreso
    referencia: v.string(), // Required - comment for the adjustment
  },
  handler: async (ctx, args) => {
    // Validate referencia is not empty
    if (!args.referencia || args.referencia.trim() === "") {
      throw new Error("La referencia es obligatoria para ajustes");
    }

    // Validate cantidad is not zero
    if (args.cantidad === 0) {
      throw new Error("La cantidad debe ser diferente de 0");
    }

    // Verify item exists
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Item no encontrado");
    }

    // Calculate new stock
    const newStock = item.stock_actual + args.cantidad;

    // Validate stock resultante >= 0
    if (newStock < 0) {
      throw new Error("El stock resultante no puede ser negativo");
    }

    // Determine type and motivo
    const type: "ingreso" | "egreso" = args.cantidad > 0 ? "ingreso" : "egreso";
    const motivo: "ajuste" = "ajuste";

    // Create stock movement
    const movementId = await ctx.db.insert("stock_movements", {
      itemId: args.itemId,
      type,
      cantidad: Math.abs(args.cantidad),
      motivo,
      referencia: args.referencia,
      createdAt: Date.now(),
      createdBy: undefined, // TODO: Add when auth is implemented
    });

    // Update stock
    const status = calculateStatus(newStock, item.stock_minimo);

    await ctx.db.patch(args.itemId, {
      stock_actual: newStock,
      status,
    });

    // Get the created movement
    const movement = await ctx.db.get(movementId);

    return {
      movement,
      newStock,
      status,
    };
  },
});
