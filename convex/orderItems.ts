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

// Query: Get all orderItems for a specific product (history)
export const getByProductId = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orderItems")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .collect();
  },
});

// Mutation: Create a single orderItem
export const create = mutation({
  args: {
    orderId: v.id("orders"),
    productId: v.id("products"),
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

    // Verify product exists
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error(`Producto con ID ${args.productId} no encontrado`);
    }

    const orderItemId = await ctx.db.insert("orderItems", {
      orderId: args.orderId,
      productId: args.productId,
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
        productId: v.id("products"),
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

    // Validate all products exist and quantities
    const orderItemIds = [];
    for (const item of args.items) {
      if (item.cantidad <= 0) {
        throw new Error("La cantidad debe ser mayor a 0");
      }

      const product = await ctx.db.get(item.productId);
      if (!product) {
        throw new Error(`Producto con ID ${item.productId} no encontrado`);
      }

      const orderItemId = await ctx.db.insert("orderItems", {
        orderId: args.orderId,
        productId: item.productId,
        cantidad: item.cantidad,
      });

      orderItemIds.push(orderItemId);
    }

    return orderItemIds;
  },
});
