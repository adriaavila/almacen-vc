import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query: Get all orders
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("orders").collect();
  },
});

// Query: Get order by ID with items populated
export const getById = query({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) {
      return null;
    }

    // Get orderItems for this order
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect();

    // Populate items
    const items = await Promise.all(
      orderItems.map(async (oi) => {
        const item = await ctx.db.get(oi.itemId);
        if (!item) {
          return null;
        }
        return {
          ...item,
          cantidad: oi.cantidad,
        };
      })
    );

    return {
      ...order,
      items: items.filter((item) => item !== null),
    };
  },
});

// Query: Get pending orders sorted by date (oldest first)
export const getPending = query({
  handler: async (ctx) => {
    // Use composite index to get pending orders already sorted by createdAt
    // The index ["status", "createdAt"] automatically sorts by createdAt ascending
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_status_createdAt", (q) => 
        q.eq("status", "pendiente")
      )
      .collect();

    return orders;
  },
});

// Query: Get orders by area
export const getByArea = query({
  args: {
    area: v.union(v.literal("Cocina"), v.literal("Cafetín"), v.literal("Limpieza")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_area", (q) => q.eq("area", args.area))
      .collect();
  },
});

// Query: Get last delivered order by area (for suggestions)
export const getLastByArea = query({
  args: {
    area: v.union(v.literal("Cocina"), v.literal("Cafetín"), v.literal("Limpieza")),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_area_status", (q) =>
        q.eq("area", args.area).eq("status", "entregado")
      )
      .collect();

    if (orders.length === 0) {
      return null;
    }

    // Sort by createdAt (most recent first)
    const sorted = orders.sort((a, b) => b.createdAt - a.createdAt);
    return sorted[0];
  },
});

// Mutation: Create a new order with items
export const create = mutation({
  args: {
    area: v.union(v.literal("Cocina"), v.literal("Cafetín"), v.literal("Limpieza")),
    items: v.array(
      v.object({
        itemId: v.id("items"),
        cantidad: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Filter out items with cantidad 0
    const validItems = args.items.filter((item) => item.cantidad > 0);

    if (validItems.length === 0) {
      throw new Error("El pedido debe incluir al menos un ítem");
    }

    // Create the order
    const orderId = await ctx.db.insert("orders", {
      area: args.area,
      status: "pendiente",
      createdAt: Date.now(),
    });

    // Create orderItems directly
    for (const item of validItems) {
      if (item.cantidad <= 0) {
        continue;
      }

      const dbItem = await ctx.db.get(item.itemId);
      if (!dbItem) {
        throw new Error(`Item con ID ${item.itemId} no encontrado`);
      }

      await ctx.db.insert("orderItems", {
        orderId,
        itemId: item.itemId,
        cantidad: item.cantidad,
      });
    }

    return orderId;
  },
});

// Mutation: Deliver an order (atomic transaction)
export const deliver = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) {
      throw new Error(`Pedido con ID ${args.id} no encontrado`);
    }

    if (order.status === "entregado") {
      throw new Error("El pedido ya fue entregado");
    }

    // Get orderItems for this order
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect();

    if (orderItems.length === 0) {
      throw new Error("El pedido no tiene ítems");
    }

    const deliveredItems: Array<{
      itemId: string;
      cantidad: number;
      newStock: number;
    }> = [];
    const lowStockItems: Array<{
      itemId: string;
      nombre: string;
      stock_actual: number;
      stock_minimo: number;
    }> = [];
    const movementIds: Array<string> = [];

    // Decrement stock for each item
    for (const oi of orderItems) {
      const item = await ctx.db.get(oi.itemId);
      if (!item) {
        continue; // Skip if item doesn't exist
      }

      // Create stock movement (egreso, consumo, referencia=orderId)
      const movementId = await ctx.db.insert("stock_movements", {
        itemId: oi.itemId,
        type: "egreso",
        cantidad: oi.cantidad,
        motivo: "consumo",
        referencia: args.id,
        createdAt: Date.now(),
        createdBy: undefined, // TODO: Add when auth is implemented
      });
      movementIds.push(movementId);

      const newStock = Math.max(0, item.stock_actual - oi.cantidad);
      const status = newStock <= item.stock_minimo ? "bajo_stock" : "ok";

      await ctx.db.patch(oi.itemId, {
        stock_actual: newStock,
        status,
      });

      deliveredItems.push({
        itemId: oi.itemId,
        cantidad: oi.cantidad,
        newStock,
      });

      if (newStock <= item.stock_minimo) {
        lowStockItems.push({
          itemId: oi.itemId,
          nombre: item.nombre,
          stock_actual: newStock,
          stock_minimo: item.stock_minimo,
        });
      }
    }

    // Update order status
    await ctx.db.patch(args.id, {
      status: "entregado",
    });

    return {
      deliveredItems,
      lowStockItems,
      movementIds,
    };
  },
});

// Mutation: Update order status
export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.union(v.literal("pendiente"), v.literal("entregado")),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) {
      throw new Error(`Pedido con ID ${args.id} no encontrado`);
    }

    await ctx.db.patch(args.id, {
      status: args.status,
    });

    return args.id;
  },
});

// Mutation: Delete an order and its related orderItems
export const remove = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) {
      throw new Error(`Pedido con ID ${args.id} no encontrado`);
    }

    // Get all orderItems for this order
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.id))
      .collect();

    // Delete all orderItems
    for (const orderItem of orderItems) {
      await ctx.db.delete(orderItem._id);
    }

    // Delete the order
    await ctx.db.delete(args.id);

    return args.id;
  },
});
