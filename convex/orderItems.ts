import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query: Get all orderItems for a specific order
export const getByOrderId = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();
  },
});

// Query: Get all orderItems for a specific item (history)
export const getByItemId = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orderItems")
      .withIndex("by_itemId", (q) => q.eq("itemId", args.itemId))
      .collect();
  },
});

// Mutation: Create a single orderItem
export const create = mutation({
  args: {
    orderId: v.id("orders"),
    itemId: v.id("items"),
    cantidad: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.cantidad <= 0) {
      throw new Error("La cantidad debe ser mayor a 0");
    }

    // Verify order exists
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error(`Pedido con ID ${args.orderId} no encontrado`);
    }

    // Verify item exists
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error(`Item con ID ${args.itemId} no encontrado`);
    }

    const orderItemId = await ctx.db.insert("orderItems", {
      orderId: args.orderId,
      itemId: args.itemId,
      cantidad: args.cantidad,
    });

    return orderItemId;
  },
});

// Mutation: Create multiple orderItems in a transaction
export const bulkCreate = mutation({
  args: {
    orderId: v.id("orders"),
    items: v.array(
      v.object({
        itemId: v.id("items"),
        cantidad: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      throw new Error("Debe incluir al menos un ítem");
    }

    // Verify order exists
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error(`Pedido con ID ${args.orderId} no encontrado`);
    }

    // Validate all items exist and quantities
    const orderItemIds = [];
    for (const item of args.items) {
      if (item.cantidad <= 0) {
        throw new Error("La cantidad debe ser mayor a 0");
      }

      const dbItem = await ctx.db.get(item.itemId);
      if (!dbItem) {
        throw new Error(`Item con ID ${item.itemId} no encontrado`);
      }

      const orderItemId = await ctx.db.insert("orderItems", {
        orderId: args.orderId,
        itemId: item.itemId,
        cantidad: item.cantidad,
      });

      orderItemIds.push(orderItemId);
    }

    return orderItemIds;
  },
});
