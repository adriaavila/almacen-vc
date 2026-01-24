import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// QUERIES
// ============================================================

// Get all products
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

// Get only active products
export const listActive = query({
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    return products.filter((p) => p.active);
  },
});

// Get product by ID
export const getById = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get product by name
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

// Get products by category
export const getByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

// Search products by name (partial match)
export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("products").collect();
    const term = args.searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
    );
  },
});

// Get all unique categories
export const getCategories = query({
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const categories = new Set(products.map((p) => p.category));
    return Array.from(categories).sort();
  },
});

// Get product with inventory info
export const getWithInventory = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return null;

    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) => q.eq("productId", args.id))
      .collect();

    return {
      ...product,
      inventory: inventory.map((inv) => ({
        location: inv.location,
        stockActual: inv.stockActual,
        stockMinimo: inv.stockMinimo,
        updatedAt: inv.updatedAt,
      })),
      totalStock: inventory.reduce((sum, inv) => sum + inv.stockActual, 0),
    };
  },
});

// Get all products with inventory summary
export const listWithInventory = query({
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const inventory = await ctx.db.query("inventory").collect();

    // Group inventory by product
    const inventoryByProduct = new Map<string, typeof inventory>();
    for (const inv of inventory) {
      const productId = inv.productId.toString();
      if (!inventoryByProduct.has(productId)) {
        inventoryByProduct.set(productId, []);
      }
      inventoryByProduct.get(productId)!.push(inv);
    }

    return products.map((product) => {
      const productInventory = inventoryByProduct.get(product._id.toString()) || [];
      const totalStock = productInventory.reduce((sum, inv) => sum + inv.stockActual, 0);
      const minStock = productInventory.reduce((sum, inv) => sum + inv.stockMinimo, 0);

      return {
        ...product,
        totalStock,
        stockAlmacen: productInventory.find((i) => i.location === "almacen")?.stockActual || 0,
        stockCafetin: productInventory.find((i) => i.location === "cafetin")?.stockActual || 0,
        status: (totalStock <= minStock ? "bajo_stock" : "ok") as "ok" | "bajo_stock",
      };
    });
  },
});

// ============================================================
// MUTATIONS
// ============================================================

// Create a new product
export const create = mutation({
  args: {
    name: v.string(),
    brand: v.string(),
    category: v.string(),
    subCategory: v.optional(v.string()),
    baseUnit: v.string(),
    purchaseUnit: v.string(),
    conversionFactor: v.number(),
    packageSize: v.number(),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate name
    const existing = await ctx.db
      .query("products")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error(`Ya existe un producto con el nombre "${args.name}"`);
    }

    const productId = await ctx.db.insert("products", {
      name: args.name,
      brand: args.brand,
      category: args.category,
      subCategory: args.subCategory,
      baseUnit: args.baseUnit,
      purchaseUnit: args.purchaseUnit,
      conversionFactor: args.conversionFactor,
      packageSize: args.packageSize,
      active: args.active ?? true,
    });

    return productId;
  },
});

// Bulk import products (for CAFETIN location)
export const bulkImportCafetin = mutation({
  args: {
    products: v.array(
      v.object({
        name: v.string(),
        baseUnit: v.string(),
        subCategory: v.optional(v.string()),
        category: v.string(),
        brand: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = {
      created: 0,
      skipped: 0,
      errors: [] as Array<{ name: string; error: string }>,
    };

    for (const productData of args.products) {
      try {
        // Check for duplicate name
        const existing = await ctx.db
          .query("products")
          .withIndex("by_name", (q) => q.eq("name", productData.name))
          .first();

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create product with defaults
        const productId = await ctx.db.insert("products", {
          name: productData.name,
          brand: productData.brand || "",
          category: productData.category,
          subCategory: productData.subCategory || undefined,
          baseUnit: productData.baseUnit,
          purchaseUnit: productData.baseUnit, // Default to same as baseUnit
          conversionFactor: 1, // Default to 1
          packageSize: 0, // Default to 0
          active: true,
        });

        // Initialize inventory for cafetin location directly
        const existingInventory = await ctx.db
          .query("inventory")
          .withIndex("by_product_location", (q) =>
            q.eq("productId", productId).eq("location", "cafetin")
          )
          .first();

        if (!existingInventory) {
          await ctx.db.insert("inventory", {
            productId,
            location: "cafetin",
            stockActual: 0,
            stockMinimo: 0,
            updatedAt: Date.now(),
          });
        }

        results.created++;
      } catch (error: any) {
        results.errors.push({
          name: productData.name,
          error: error.message || "Error desconocido",
        });
      }
    }

    return results;
  },
});

// Update a product
export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    category: v.optional(v.string()),
    subCategory: v.optional(v.string()),
    baseUnit: v.optional(v.string()),
    purchaseUnit: v.optional(v.string()),
    conversionFactor: v.optional(v.number()),
    packageSize: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const product = await ctx.db.get(id);
    if (!product) {
      throw new Error(`Producto con ID ${id} no encontrado`);
    }

    // Check for duplicate name if name is being updated
    if (updates.name && updates.name !== product.name) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_name", (q) => q.eq("name", updates.name!))
        .first();

      if (existing) {
        throw new Error(`Ya existe un producto con el nombre "${updates.name}"`);
      }
    }

    // Filter out undefined values
    const cleanUpdates: Partial<typeof product> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        (cleanUpdates as Record<string, unknown>)[key] = value;
      }
    }

    await ctx.db.patch(id, cleanUpdates);

    return { id };
  },
});

// Toggle active status
export const toggleActive = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error(`Producto con ID ${args.id} no encontrado`);
    }

    const newActive = !product.active;
    await ctx.db.patch(args.id, { active: newActive });

    return { id: args.id, active: newActive };
  },
});

// Delete a product (soft delete - just deactivate)
export const softDelete = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error(`Producto con ID ${args.id} no encontrado`);
    }

    await ctx.db.patch(args.id, { active: false });

    return { id: args.id };
  },
});

// Update unit conversion settings
export const updateUnitConversion = mutation({
  args: {
    id: v.id("products"),
    baseUnit: v.string(),
    purchaseUnit: v.string(),
    conversionFactor: v.number(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error(`Producto con ID ${args.id} no encontrado`);
    }

    if (args.conversionFactor <= 0) {
      throw new Error("El factor de conversión debe ser mayor a 0");
    }

    await ctx.db.patch(args.id, {
      baseUnit: args.baseUnit,
      purchaseUnit: args.purchaseUnit,
      conversionFactor: args.conversionFactor,
    });

    return { id: args.id };
  },
});
