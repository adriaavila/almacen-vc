import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query: Get UI config for a user and page
export const getConfig = query({
  args: {
    userId: v.string(),
    page: v.string(),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("ui_config")
      .withIndex("by_user_page", (q) =>
        q.eq("userId", args.userId).eq("page", args.page)
      )
      .first();

    return config?.config ?? null;
  },
});

// Mutation: Save UI config
export const saveConfig = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ui_config")
      .withIndex("by_user_page", (q) =>
        q.eq("userId", args.userId).eq("page", args.page)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        config: args.config,
      });
      return existing._id;
    } else {
      const id = await ctx.db.insert("ui_config", {
        userId: args.userId,
        page: args.page,
        config: args.config,
      });
      return id;
    }
  },
});
