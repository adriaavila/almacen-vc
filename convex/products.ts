import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const capitalize = (s: string) => {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
};

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

// Get all unique subcategories (optionally filtered by category)
export const getSubCategories = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let products;
    if (args.category) {
      products = await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      products = await ctx.db.query("products").collect();
    }

    const subCategories = new Set(
      products
        .map((p) => p.subCategory)
        .filter((sc): sc is string => !!sc && sc.trim() !== '')
    );
    return Array.from(subCategories).sort();
  },
});

// Get all unique units
export const getUniqueUnits = query({
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const units = new Set(
      products
        .map((p) => p.baseUnit)
        .filter((u) => !!u && u.trim() !== '')
    );
    return Array.from(units).sort();
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
        stockMinimoAlmacen: productInventory.find((i) => i.location === "almacen")?.stockMinimo || 0,
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
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate name - if exists, return existing product ID
    // This allows adding inventory for the same product in different locations
    const existing = await ctx.db
      .query("products")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      // Product already exists, return its ID instead of creating a duplicate
      // The caller can then add inventory for this product in a new location
      return existing._id;
    }

    const productId = await ctx.db.insert("products", {
      name: args.name,
      brand: args.brand,
      category: args.category,
      subCategory: args.subCategory,
      baseUnit: capitalize(args.baseUnit),
      purchaseUnit: capitalize(args.purchaseUnit),
      conversionFactor: args.conversionFactor,
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
          baseUnit: capitalize(productData.baseUnit),
          purchaseUnit: capitalize(productData.baseUnit), // Default to same as baseUnit
          conversionFactor: 1, // Default to 1
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

// Bulk import products with inventory (general purpose)
export const bulkImport = mutation({
  args: {
    products: v.array(
      v.object({
        id: v.optional(v.string()), // Optional product ID for updating existing products
        name: v.string(),
        brand: v.optional(v.string()),
        category: v.string(),
        subCategory: v.optional(v.string()),
        baseUnit: v.string(),
        purchaseUnit: v.optional(v.string()),
        conversionFactor: v.optional(v.number()),
        active: v.optional(v.boolean()),
        stockAlmacen: v.optional(v.number()),
        stockCafetin: v.optional(v.number()),
        stockMinimoAlmacen: v.optional(v.number()),
        stockMinimoCafetin: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; name: string; error: string }>,
    };

    for (let i = 0; i < args.products.length; i++) {
      const productData = args.products[i];
      try {
        // Validate required fields
        if (!productData.name || productData.name.trim() === '') {
          results.errors.push({
            row: i + 1,
            name: productData.name || '(sin nombre)',
            error: 'El nombre es requerido',
          });
          continue;
        }

        if (!productData.category || productData.category.trim() === '') {
          results.errors.push({
            row: i + 1,
            name: productData.name,
            error: 'La categoría es requerida',
          });
          continue;
        }

        if (!productData.baseUnit || productData.baseUnit.trim() === '') {
          results.errors.push({
            row: i + 1,
            name: productData.name,
            error: 'La unidad base es requerida',
          });
          continue;
        }

        // Validate numeric fields
        if (productData.conversionFactor !== undefined && productData.conversionFactor <= 0) {
          results.errors.push({
            row: i + 1,
            name: productData.name,
            error: 'El factor de conversión debe ser mayor a 0',
          });
          continue;
        }

        // Validate ID format if provided (Convex IDs start with 'j' or 'k' followed by alphanumeric)
        if (productData.id && !/^[jk][a-z0-9]+$/.test(productData.id)) {
          results.errors.push({
            row: i + 1,
            name: productData.name,
            error: `ID inválido: "${productData.id}". Debe ser un ID válido de Convex.`,
          });
          continue;
        }

        const purchaseUnit = productData.purchaseUnit ? capitalize(productData.purchaseUnit) : capitalize(productData.baseUnit);
        const conversionFactor = productData.conversionFactor ?? 1;
        const active = productData.active ?? true;

        let productId;
        let existing = null;

        // First, try to find product by ID if provided
        if (productData.id) {
          try {
            // Convert string ID to Convex ID type (Convex validates at runtime)
            // Type assertion is safe here because we've already validated the format
            const productId = productData.id as Id<"products">;
            existing = await ctx.db.get(productId);

            if (!existing) {
              results.errors.push({
                row: i + 1,
                name: productData.name,
                error: `Producto con ID "${productData.id}" no encontrado. Se intentará buscar por nombre.`,
              });
              existing = null; // Ensure existing is null so we fall through to name-based matching
            }
          } catch (error: any) {
            // Invalid ID format or product not found - fall through to name-based matching
            results.errors.push({
              row: i + 1,
              name: productData.name,
              error: `ID inválido o producto no encontrado: "${productData.id}". Se intentará buscar por nombre.`,
            });
            existing = null;
          }
        }

        // If no product found by ID, try name-based matching
        if (!existing) {
          existing = await ctx.db
            .query("products")
            .withIndex("by_name", (q) => q.eq("name", productData.name))
            .first();
        }

        if (existing) {
          // Update existing product
          const updates: Partial<typeof existing> = {};

          // Allow name updates if ID was provided (ID-based update)
          if (productData.id && productData.name !== existing.name) {
            // Check if new name conflicts with another product
            const nameConflict = await ctx.db
              .query("products")
              .withIndex("by_name", (q) => q.eq("name", productData.name))
              .first();

            if (nameConflict && nameConflict._id !== existing._id) {
              results.errors.push({
                row: i + 1,
                name: productData.name,
                error: `No se puede cambiar el nombre a "${productData.name}" porque ya existe otro producto con ese nombre.`,
              });
              continue;
            }
            updates.name = productData.name;
          }

          if (productData.brand !== undefined) updates.brand = productData.brand || "";
          if (productData.category !== undefined) updates.category = productData.category;
          if (productData.subCategory !== undefined) updates.subCategory = productData.subCategory || undefined;
          if (productData.baseUnit !== undefined) updates.baseUnit = capitalize(productData.baseUnit);
          if (productData.purchaseUnit !== undefined) updates.purchaseUnit = purchaseUnit;
          if (productData.conversionFactor !== undefined) updates.conversionFactor = conversionFactor;
          if (productData.active !== undefined) updates.active = active;

          await ctx.db.patch(existing._id, updates);
          productId = existing._id;
          results.updated++;
        } else {
          // Create new product
          productId = await ctx.db.insert("products", {
            name: productData.name,
            brand: productData.brand || "",
            category: productData.category,
            subCategory: productData.subCategory || undefined,
            baseUnit: capitalize(productData.baseUnit),
            purchaseUnit: purchaseUnit,
            conversionFactor: conversionFactor,
            active: active,
          });
          results.created++;
        }

        // Handle inventory initialization/updates
        const now = Date.now();

        // Almacen inventory
        if (productData.stockAlmacen !== undefined || productData.stockMinimoAlmacen !== undefined) {
          const existingInventoryAlmacen = await ctx.db
            .query("inventory")
            .withIndex("by_product_location", (q) =>
              q.eq("productId", productId).eq("location", "almacen")
            )
            .first();

          const stockAlmacen = productData.stockAlmacen ?? existingInventoryAlmacen?.stockActual ?? 0;
          const stockMinimoAlmacen = productData.stockMinimoAlmacen ?? existingInventoryAlmacen?.stockMinimo ?? 0;

          if (existingInventoryAlmacen) {
            await ctx.db.patch(existingInventoryAlmacen._id, {
              stockActual: stockAlmacen,
              stockMinimo: stockMinimoAlmacen,
              updatedAt: now,
            });
          } else {
            await ctx.db.insert("inventory", {
              productId,
              location: "almacen",
              stockActual: stockAlmacen,
              stockMinimo: stockMinimoAlmacen,
              updatedAt: now,
            });
          }
        }

        // Cafetin inventory
        if (productData.stockCafetin !== undefined || productData.stockMinimoCafetin !== undefined) {
          const existingInventoryCafetin = await ctx.db
            .query("inventory")
            .withIndex("by_product_location", (q) =>
              q.eq("productId", productId).eq("location", "cafetin")
            )
            .first();

          const stockCafetin = productData.stockCafetin ?? existingInventoryCafetin?.stockActual ?? 0;
          const stockMinimoCafetin = productData.stockMinimoCafetin ?? existingInventoryCafetin?.stockMinimo ?? 0;

          if (existingInventoryCafetin) {
            await ctx.db.patch(existingInventoryCafetin._id, {
              stockActual: stockCafetin,
              stockMinimo: stockMinimoCafetin,
              updatedAt: now,
            });
          } else {
            await ctx.db.insert("inventory", {
              productId,
              location: "cafetin",
              stockActual: stockCafetin,
              stockMinimo: stockMinimoCafetin,
              updatedAt: now,
            });
          }
        }
      } catch (error: any) {
        results.errors.push({
          row: i + 1,
          name: productData.name || '(sin nombre)',
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
    active: v.optional(v.boolean()),
    availableForSale: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const product = await ctx.db.get(id);
    if (!product) {
      throw new Error(`Producto con ID ${id} no encontrado`);
    }

    // Check for duplicate name if name is being updated
    // Only throw error if the duplicate is a different product (not the one being updated)
    if (updates.name && updates.name !== product.name) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_name", (q) => q.eq("name", updates.name!))
        .first();

      if (existing && existing._id !== id) {
        throw new Error(`Ya existe un producto con el nombre "${updates.name}"`);
      }
    }

    // Filter out undefined values
    const cleanUpdates: Partial<typeof product> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        if (key === "baseUnit" || key === "purchaseUnit") {
          (cleanUpdates as Record<string, unknown>)[key] = capitalize(value as string);
        } else {
          (cleanUpdates as Record<string, unknown>)[key] = value;
        }
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

// Delete a product permanently (hard delete)
// This will also delete all related inventory records
// Movements are kept for audit trail
export const deleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error(`Producto con ID ${args.id} no encontrado`);
    }

    // Delete all inventory records for this product
    const inventoryRecords = await ctx.db
      .query("inventory")
      .withIndex("by_product_location", (q) => q.eq("productId", args.id))
      .collect();

    for (const inv of inventoryRecords) {
      await ctx.db.delete(inv._id);
    }

    // Delete the product
    await ctx.db.delete(args.id);

    // Note: We keep movements for audit trail, even if the product is deleted
    // This allows historical tracking of what happened

    return { id: args.id, deletedInventoryCount: inventoryRecords.length };
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
      baseUnit: capitalize(args.baseUnit),
      purchaseUnit: capitalize(args.purchaseUnit),
      conversionFactor: args.conversionFactor,
    });

    return { id: args.id };
  },
});

// Migration to fix capitalization of existing products
export const fixProductUnitsCapitalization = mutation({
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let updatedCount = 0;

    for (const product of products) {
      let needsUpdate = false;
      const updates: any = {};

      if (product.baseUnit && product.baseUnit !== capitalize(product.baseUnit)) {
        updates.baseUnit = capitalize(product.baseUnit);
        needsUpdate = true;
      }

      if (product.purchaseUnit && product.purchaseUnit !== capitalize(product.purchaseUnit)) {
        updates.purchaseUnit = capitalize(product.purchaseUnit);
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(product._id, updates);
        updatedCount++;
      }
    }

    return {
      total: products.length,
      updated: updatedCount,
    };
  },
});

