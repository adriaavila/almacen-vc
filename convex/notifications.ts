import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all notification recipients
 */
export const list = query({
    handler: async (ctx) => {
        return await ctx.db.query("notification_settings").collect();
    },
});

/**
 * Create a new recipient
 */
export const create = mutation({
    args: {
        name: v.string(),
        chatId: v.string(),
        isAdmin: v.boolean(),
        preferences: v.object({
            lowStock: v.boolean(),
            weeklyReport: v.boolean(),
            newOrders: v.boolean(),
        }),
    },
    handler: async (ctx, args) => {
        // Check if chatId already exists
        const existing = await ctx.db
            .query("notification_settings")
            .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
            .first();

        if (existing) {
            throw new Error(`El Chat ID ${args.chatId} ya está registrado`);
        }

        return await ctx.db.insert("notification_settings", {
            name: args.name,
            chatId: args.chatId,
            isAdmin: args.isAdmin,
            enabled: true,
            preferences: args.preferences,
        });
    },
});

/**
 * Update a recipient
 */
export const update = mutation({
    args: {
        id: v.id("notification_settings"),
        name: v.string(),
        chatId: v.string(),
        isAdmin: v.boolean(),
        preferences: v.object({
            lowStock: v.boolean(),
            weeklyReport: v.boolean(),
            newOrders: v.boolean(),
        }),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.id);
        if (!existing) {
            throw new Error("Recipient not found");
        }

        // Check if new chatId conflicts with another (if changed)
        if (args.chatId !== existing.chatId) {
            const conflict = await ctx.db
                .query("notification_settings")
                .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
                .first();

            if (conflict) {
                throw new Error(`El Chat ID ${args.chatId} ya está registrado`);
            }
        }

        await ctx.db.patch(args.id, {
            name: args.name,
            chatId: args.chatId,
            isAdmin: args.isAdmin,
            preferences: args.preferences,
        });
    },
});

/**
 * Remove a recipient
 */
export const remove = mutation({
    args: { id: v.id("notification_settings") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

/**
 * Toggle enabled status
 */
export const toggle = mutation({
    args: { id: v.id("notification_settings") },
    handler: async (ctx, args) => {
        const recipient = await ctx.db.get(args.id);
        if (!recipient) {
            throw new Error("Recipient not found");
        }
        await ctx.db.patch(args.id, { enabled: !recipient.enabled });
    },
});
