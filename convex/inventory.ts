import { query, mutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ============================================================
// INTERNAL QUERIES (for use in httpActions)
// ============================================================

// Internal: Get all products (for webhook)
export const internalListProducts = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

// Internal: Get all inventory with products (for webhook)
export const internalListInventoryWithProducts = internalQuery({
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();

    const inventoryWithProducts = await Promise.all(
      inventory.map(async (inv) => {
        const product = await ctx.db.get(inv.productId);
        return {
          ...inv,
          product: product || undefined,
        };
      })
    );

    return inventoryWithProducts;
  },
});

// ============================================================
// QUERIES
// ============================================================

// Get all inventory records
export const list = query({
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();

    // Populate product info
    const inventoryWithProducts = await Promise.all(
      inventory.map(async (inv) => {
        const product = await ctx.db.get(inv.productId);
        return {
          ...inv,
          product: product || undefined,
        };
      })
    );

    return inventoryWithProducts;
  },
});

// Get inventory by location
export const getByLocation = query({
  args: {
    location: v.union(v.literal("almacen"), v.literal("cafetin")),
  },
  handler: async (ctx, args) => {
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_location", (q) => q.eq("location", args.location))
      .collect();

    // Populate product info
    const inventoryWithProducts = await Promise.all(
      inventory.map(async (inv) => {
        const product = await ctx.db.get(inv.productId);
        return {
          ...inv,
          product: product || undefined,
        };
      })
    );

    return inventoryWithProducts;
  },
});

// Get inventory for a specific product (all locations)
export const getByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) => q.eq("productId", args.productId))
      .collect();
  },
});

// Get inventory for a specific product at a specific location
export const getByProductLocation = query({
  args: {
    productId: v.id("products"),
    location: v.union(v.literal("almacen"), v.literal("cafetin")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q.eq("productId", args.productId).eq("location", args.location)
      )
      .first();
  },
});

// Get low stock items
export const getLowStock = query({
  args: {
    location: v.optional(v.union(v.literal("almacen"), v.literal("cafetin"))),
  },
  handler: async (ctx, args) => {
    let inventory;
    if (args.location) {
      inventory = await ctx.db
        .query("inventory")
        .withIndex("by_location", (q) => q.eq("location", args.location!))
        .collect();
    } else {
      inventory = await ctx.db.query("inventory").collect();
    }

    // Filter low stock
    const lowStock = inventory.filter((inv) => inv.stockActual <= inv.stockMinimo);

    // Populate product info
    const lowStockWithProducts = await Promise.all(
      lowStock.map(async (inv) => {
        const product = await ctx.db.get(inv.productId);
        return {
          ...inv,
          product: product || undefined,
        };
      })
    );

    return lowStockWithProducts;
  },
});

// Get inventory summary (aggregated by product)
export const getSummary = query({
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();
    const products = await ctx.db.query("products").collect();

    // Aggregate inventory by product
    const summaryMap = new Map<
      string,
      {
        productId: string;
        product: (typeof products)[0] | undefined;
        almacen: number;
        cafetin: number;
        total: number;
        minimo: number;
        status: "ok" | "bajo_stock";
      }
    >();

    for (const inv of inventory) {
      const productId = inv.productId.toString();
      const existing = summaryMap.get(productId) || {
        productId,
        product: undefined,
        almacen: 0,
        cafetin: 0,
        total: 0,
        minimo: 0,
        status: "ok" as const,
      };

      if (inv.location === "almacen") {
        existing.almacen = inv.stockActual;
      } else {
        existing.cafetin = inv.stockActual;
      }
      existing.total = existing.almacen + existing.cafetin;
      existing.minimo += inv.stockMinimo;
      existing.status = existing.total <= existing.minimo ? "bajo_stock" : "ok";

      summaryMap.set(productId, existing);
    }

    // Add product info
    for (const product of products) {
      const summary = summaryMap.get(product._id.toString());
      if (summary) {
        summary.product = product;
      }
    }

    return Array.from(summaryMap.values());
  },
});

// ============================================================
// MUTATIONS
// ============================================================

// Update stock at a location (creates movement record)
export const updateStock = mutation({
  args: {
    productId: v.id("products"),
    location: v.union(v.literal("almacen"), v.literal("cafetin")),
    newStock: v.number(),
    user: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.newStock < 0) {
      throw new Error("El stock no puede ser negativo");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Producto no encontrado");
    }

    // Get or create inventory record
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
      // Update existing
      await ctx.db.patch(inventory._id, {
        stockActual: args.newStock,
        updatedAt: now,
      });
    } else {
      // Create new inventory record
      await ctx.db.insert("inventory", {
        productId: args.productId,
        location: args.location,
        stockActual: args.newStock,
        stockMinimo: 0,
        updatedAt: now,
      });
    }

    // Create adjustment movement
    if (difference !== 0) {
      await ctx.db.insert("movements", {
        productId: args.productId,
        type: "AJUSTE",
        from: undefined,
        to: args.location.toUpperCase(),
        quantity: Math.abs(difference),
        prevStock,
        nextStock: args.newStock,
        user: args.user,
        timestamp: now,
      });
    }

    // Check for low stock alert (Transition: prev > min -> new <= min)
    const stockMinimo = inventory?.stockMinimo || 0;

    // Alert logic:
    // Ensure we capture the case where we *just* crossed the threshold.
    if (prevStock > stockMinimo && args.newStock <= stockMinimo) {
      const productName = product?.name || "Producto";
      const unit = product?.baseUnit || "u";

      const message = `⚠️ <b>STOCK BAJO</b>
${productName}
Solo quedan: <b>${args.newStock} ${unit}</b>
(Min: ${stockMinimo})`;

      // Schedule notification
      await ctx.scheduler.runAfter(0, internal.telegram.sendMessage, { message, type: "lowStock" });
    }

    return {
      productId: args.productId,
      location: args.location,
      prevStock,
      newStock: args.newStock,
      difference,
    };
  },
});

// Transfer stock between locations (TRASLADO)
export const transfer = mutation({
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

    // Create TRASLADO movement
    await ctx.db.insert("movements", {
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
      productId: args.productId,
      from: args.from,
      to: args.to,
      quantity: args.quantity,
      sourceStock: { prev: prevSourceStock, new: newSourceStock },
      destStock: { prev: prevDestStock, new: newDestStock },
    };
  },
});

// Set minimum stock threshold
export const setMinStock = mutation({
  args: {
    productId: v.id("products"),
    location: v.union(v.literal("almacen"), v.literal("cafetin")),
    stockMinimo: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.stockMinimo < 0) {
      throw new Error("El stock mínimo no puede ser negativo");
    }

    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q.eq("productId", args.productId).eq("location", args.location)
      )
      .first();

    if (!inventory) {
      // Create inventory record with 0 stock if it doesn't exist
      await ctx.db.insert("inventory", {
        productId: args.productId,
        location: args.location,
        stockActual: 0,
        stockMinimo: args.stockMinimo,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(inventory._id, {
        stockMinimo: args.stockMinimo,
      });
    }

    return { productId: args.productId, location: args.location, stockMinimo: args.stockMinimo };
  },
});

// Initialize inventory for a product at a location
// If inventory already exists, updates it instead of throwing an error
export const initialize = mutation({
  args: {
    productId: v.id("products"),
    location: v.union(v.literal("almacen"), v.literal("cafetin")),
    stockActual: v.number(),
    stockMinimo: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error("Producto no encontrado");
    }

    // Check if inventory already exists
    const existing = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) =>
        q.eq("productId", args.productId).eq("location", args.location)
      )
      .first();

    if (existing) {
      // Update existing inventory instead of throwing error
      // This allows adding the same product to different locations
      await ctx.db.patch(existing._id, {
        stockActual: args.stockActual,
        stockMinimo: args.stockMinimo,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const inventoryId = await ctx.db.insert("inventory", {
      productId: args.productId,
      location: args.location,
      stockActual: args.stockActual,
      stockMinimo: args.stockMinimo,
      updatedAt: Date.now(),
    });

    return inventoryId;
  },
});

// Bulk update all cafetin location products to stock 1
export const setAllCafetinStockToOne = mutation({
  args: {
    user: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all inventory records for cafetin location
    const cafetinInventory = await ctx.db
      .query("inventory")
      .withIndex("by_location", (q) => q.eq("location", "cafetin"))
      .collect();

    const now = Date.now();
    const results = [];

    for (const inv of cafetinInventory) {
      const prevStock = inv.stockActual;

      // Only update if stock is not already 1
      if (prevStock !== 1) {
        // Update inventory
        await ctx.db.patch(inv._id, {
          stockActual: 1,
          updatedAt: now,
        });

        // Create adjustment movement
        const difference = 1 - prevStock;
        await ctx.db.insert("movements", {
          productId: inv.productId,
          type: "AJUSTE",
          from: undefined,
          to: "CAFETIN",
          quantity: Math.abs(difference),
          prevStock,
          nextStock: 1,
          user: args.user,
          timestamp: now,
        });

        results.push({
          inventoryId: inv._id,
          productId: inv.productId,
          prevStock,
          newStock: 1,
        });
      }
    }

    return {
      updated: results.length,
      total: cafetinInventory.length,
      results,
    };
  },
});
