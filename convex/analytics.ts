import { query } from "./_generated/server";
import { v } from "convex/values";

// Helper to format date key for grouping
function formatDateKey(date: Date, groupBy: "day" | "week" | "month"): string {
  if (groupBy === "day") {
    return date.toISOString().split("T")[0];
  } else if (groupBy === "week") {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return weekStart.toISOString().split("T")[0];
  } else {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
}

// Helper to filter by date range
function filterByDateRange<T extends { createdAt?: number; timestamp?: number }>(
  items: T[],
  startDate?: number,
  endDate?: number
): T[] {
  return items.filter((item) => {
    const date = (item.createdAt ?? item.timestamp) as number;
    if (startDate !== undefined && date < startDate) {
      return false;
    }
    if (endDate !== undefined && date > endDate) {
      return false;
    }
    return true;
  });
}

// Helper to group by day/week/month
function groupByPeriod(
  items: Array<{ createdAt: number }>,
  groupBy: "day" | "week" | "month"
): Map<string, number> {
  const grouped = new Map<string, number>();

  items.forEach((item) => {
    const date = new Date(item.createdAt);
    let key: string;

    if (groupBy === "day") {
      key = date.toISOString().split("T")[0];
    } else if (groupBy === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split("T")[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    grouped.set(key, (grouped.get(key) || 0) + 1);
  });

  return grouped;
}

// Order Analytics

export const getOrderStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allOrders = await ctx.db.query("orders").collect();
    const orders = filterByDateRange(allOrders, args.startDate, args.endDate);

    const stats = {
      total: orders.length,
      delivered: orders.filter((o) => o.status === "entregado").length,
      pending: orders.filter((o) => o.status === "pendiente").length,
      byArea: {
        Cocina: orders.filter((o) => o.area === "Cocina").length,
        Cafetin: orders.filter((o) => o.area === "Cafetin").length,
        Limpieza: orders.filter((o) => o.area === "Limpieza").length,
        "Las casas": orders.filter((o) => o.area === "Las casas").length,
      },
    };

    return {
      ...stats,
      fulfillmentRate: stats.total > 0 ? stats.delivered / stats.total : 0,
    };
  },
});

export const getOrderTrends = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    groupBy: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
  },
  handler: async (ctx, args) => {
    const allOrders = await ctx.db.query("orders").collect();
    const orders = filterByDateRange(allOrders, args.startDate, args.endDate);
    const groupBy = args.groupBy || "day";

    const totalGrouped = groupByPeriod(orders, groupBy);
    const deliveredGrouped = groupByPeriod(
      orders.filter((o) => o.status === "entregado"),
      groupBy
    );
    const pendingGrouped = groupByPeriod(
      orders.filter((o) => o.status === "pendiente"),
      groupBy
    );

    // Combine all keys and sort
    const allKeys = Array.from(
      new Set([...totalGrouped.keys(), ...deliveredGrouped.keys(), ...pendingGrouped.keys()])
    ).sort();

    return allKeys.map((key) => ({
      period: key,
      total: totalGrouped.get(key) || 0,
      delivered: deliveredGrouped.get(key) || 0,
      pending: pendingGrouped.get(key) || 0,
    }));
  },
});

export const getOrdersByArea = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allOrders = await ctx.db.query("orders").collect();
    const orders = filterByDateRange(allOrders, args.startDate, args.endDate);

    // Get order items to calculate consumption
    // Use ASCII-safe keys for Convex compatibility
    const areaKeyMap: Record<string, "Cocina" | "Cafetin" | "Limpieza" | "Las casas"> = {
      Cocina: "Cocina",
      "Cafetin": "Cafetin",
      Limpieza: "Limpieza",
      "Las casas": "Las casas",
    };

    const ordersByArea = {
      Cocina: { count: 0, totalQuantity: 0 },
      Cafetin: { count: 0, totalQuantity: 0 },
      Limpieza: { count: 0, totalQuantity: 0 },
      "Las casas": { count: 0, totalQuantity: 0 },
    };

    for (const order of orders) {
      if (order.status === "entregado") {
        const key = areaKeyMap[order.area];
        ordersByArea[key].count += 1;

        const orderItems = await ctx.db
          .query("orderItems")
          .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
          .collect();

        const totalQty = orderItems.reduce((sum, oi) => sum + oi.cantidad, 0);
        ordersByArea[key].totalQuantity += totalQty;
      }
    }

    return ordersByArea;
  },
});

export const getAverageDeliveryTime = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Optimize: fetch only delivered orders within range using index
    let ordersQuery = ctx.db.query("orders").withIndex("by_status_createdAt", (q) => {
      if (args.startDate !== undefined) {
        return q.eq("status", "entregado").gte("createdAt", args.startDate);
      }
      return q.eq("status", "entregado");
    });

    let deliveredOrders = await ordersQuery.collect();
    if (args.endDate !== undefined) {
      deliveredOrders = deliveredOrders.filter(o => o.createdAt <= args.endDate!);
    }

    if (deliveredOrders.length === 0) {
      return { averageHours: 0, averageDays: 0, count: 0 };
    }

    // Limit to the most recent 500 to avoid computational timeouts or read limits if there are thousands
    const ordersToProcess = deliveredOrders.slice(-500);
    const times: number[] = [];

    for (const order of ordersToProcess) {
      // Try exact match using orderId first
      let movement = await ctx.db
        .query("movements")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .filter(q => q.or(q.eq(q.field("type"), "CONSUMO"), q.eq(q.field("type"), "TRASLADO")))
        .first();

      if (!movement) {
        // Fallback approximation: find the first relevant movement after order creation
        movement = await ctx.db
          .query("movements")
          .withIndex("by_timestamp", (q) => q.gte("timestamp", order.createdAt))
          .filter(q => q.and(
            q.lte(q.field("timestamp"), order.createdAt + 7 * 24 * 60 * 60 * 1000), // Within 7 days
            q.or(q.eq(q.field("type"), "CONSUMO"), q.eq(q.field("type"), "TRASLADO"))
          ))
          .first();
      }

      if (movement) {
        const deliveryTime = movement.timestamp - order.createdAt;
        if (deliveryTime > 0) {
          times.push(deliveryTime);
        }
      }
    }

    if (times.length === 0) {
      return { averageHours: 0, averageDays: 0, count: 0 };
    }

    const avgMs = times.reduce((sum, t) => sum + t, 0) / times.length;
    const avgHours = avgMs / (1000 * 60 * 60);
    const avgDays = avgHours / 24;

    return {
      averageHours: Math.round(avgHours * 10) / 10,
      averageDays: Math.round(avgDays * 10) / 10,
      count: times.length,
    };
  },
});

export const getPendingOrdersAging = query({
  handler: async (ctx) => {
    const pendingOrders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "pendiente"))
      .collect();

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const threeDays = 3 * oneDay;

    const aging = {
      "0-1 day": [] as Array<{ _id: string; area: string; createdAt: number; ageHours: number }>,
      "1-3 days": [] as Array<{ _id: string; area: string; createdAt: number; ageHours: number }>,
      "3+ days": [] as Array<{ _id: string; area: string; createdAt: number; ageHours: number }>,
    };

    pendingOrders.forEach((order) => {
      const age = now - order.createdAt;
      const ageHours = age / (1000 * 60 * 60);

      const orderInfo = {
        _id: order._id,
        area: order.area,
        createdAt: order.createdAt,
        ageHours: Math.round(ageHours * 10) / 10,
      };

      if (age <= oneDay) {
        aging["0-1 day"].push(orderInfo);
      } else if (age <= threeDays) {
        aging["1-3 days"].push(orderInfo);
      } else {
        aging["3+ days"].push(orderInfo);
      }
    });

    return aging;
  },
});

// Inventory Analytics

export const getInventoryHealth = query({
  handler: async (ctx) => {
    // Use products with inventory instead of items
    const products = await ctx.db.query("products").collect();
    const activeProducts = products.filter((p) => p.active);

    // Get inventory for all products to check low stock
    const inventory = await ctx.db.query("inventory").collect();
    const inventoryByProduct = new Map(inventory.map(inv => [inv.productId, inv]));

    let lowStockCount = 0;
    for (const product of activeProducts) {
      const inv = inventoryByProduct.get(product._id);
      if (inv && inv.stockActual <= inv.stockMinimo) {
        lowStockCount++;
      }
    }

    return {
      total: activeProducts.length,
      lowStock: lowStockCount,
      healthy: activeProducts.length - lowStockCount,
      healthPercentage: activeProducts.length > 0
        ? Math.round(((activeProducts.length - lowStockCount) / activeProducts.length) * 100)
        : 0,
    };
  },
});

export const getLowStockTrend = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Use products with inventory instead of items
    const products = await ctx.db.query("products").collect();
    const activeProducts = products.filter((p) => p.active);

    // Get inventory for all products to check low stock
    const inventory = await ctx.db.query("inventory").collect();
    const inventoryByProduct = new Map(inventory.map(inv => [inv.productId, inv]));

    let lowStockCount = 0;
    for (const product of activeProducts) {
      const inv = inventoryByProduct.get(product._id);
      if (inv && inv.stockActual <= inv.stockMinimo) {
        lowStockCount++;
      }
    }

    return {
      current: lowStockCount,
      // Future: track historical data
    };
  },
});

export const getMostRequestedItems = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allOrders = await ctx.db.query("orders").collect();
    const orders = filterByDateRange(
      allOrders.filter((o) => o.status === "entregado"),
      args.startDate,
      args.endDate
    );

    const productStats = new Map<
      string,
      { productId: string; nombre: string; orderCount: number; totalQuantity: number; lastOrdered: number }
    >();

    for (const order of orders) {
      const orderItems = await ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .collect();

      for (const oi of orderItems) {
        // Use only productId - skip if not available
        if (!oi.productId) continue;

        const product = await ctx.db.get(oi.productId);
        if (!product) continue;

        const productId = oi.productId;
        const nombre = product.name;

        const existing = productStats.get(productId) || {
          productId: productId,
          nombre: nombre,
          orderCount: 0,
          totalQuantity: 0,
          lastOrdered: order.createdAt,
        };

        existing.orderCount += 1;
        existing.totalQuantity += oi.cantidad;
        if (order.createdAt > existing.lastOrdered) {
          existing.lastOrdered = order.createdAt;
        }

        productStats.set(productId, existing);
      }
    }

    const sorted = Array.from(productStats.values())
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, args.limit || 10);

    return sorted;
  },
});

// Stock Movement Analytics

export const getMovementStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allMovements = await ctx.db.query("movements").collect();
    const movements = filterByDateRange(allMovements, args.startDate, args.endDate);

    // Map new movement types to legacy concepts
    const ingresos = movements.filter((m) => m.type === "COMPRA" || m.type === "AJUSTE");
    const egresos = movements.filter((m) => m.type === "CONSUMO" || m.type === "TRASLADO");

    const totalIngresos = ingresos.reduce((sum, m) => sum + m.quantity, 0);
    const totalEgresos = egresos.reduce((sum, m) => sum + m.quantity, 0);

    return {
      ingresos: {
        count: ingresos.length,
        totalQuantity: totalIngresos,
      },
      egresos: {
        count: egresos.length,
        totalQuantity: totalEgresos,
      },
      netChange: totalIngresos - totalEgresos,
    };
  },
});

export const getMovementTrends = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    groupBy: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
  },
  handler: async (ctx, args) => {
    const allMovements = await ctx.db.query("movements").collect();
    const movements = filterByDateRange(allMovements, args.startDate, args.endDate);
    const groupBy = args.groupBy || "day";

    // Map new movement types to legacy concepts
    const ingresos = movements.filter((m) => m.type === "COMPRA" || m.type === "AJUSTE");
    const egresos = movements.filter((m) => m.type === "CONSUMO" || m.type === "TRASLADO");

    const ingresosGrouped = new Map<string, number>();
    const egresosGrouped = new Map<string, number>();

    ingresos.forEach((m) => {
      const date = new Date(m.timestamp);
      const key = formatDateKey(date, groupBy);
      ingresosGrouped.set(key, (ingresosGrouped.get(key) || 0) + m.quantity);
    });

    egresos.forEach((m) => {
      const date = new Date(m.timestamp);
      const key = formatDateKey(date, groupBy);
      egresosGrouped.set(key, (egresosGrouped.get(key) || 0) + m.quantity);
    });

    const allKeys = Array.from(
      new Set([...ingresosGrouped.keys(), ...egresosGrouped.keys()])
    ).sort();

    return allKeys.map((key) => ({
      period: key,
      ingresos: ingresosGrouped.get(key) || 0,
      egresos: egresosGrouped.get(key) || 0,
      netChange: (ingresosGrouped.get(key) || 0) - (egresosGrouped.get(key) || 0),
    }));
  },
});

// Area Consumption

export const getConsumptionByArea = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allOrders = await ctx.db.query("orders").collect();
    const orders = filterByDateRange(
      allOrders.filter((o) => o.status === "entregado"),
      args.startDate,
      args.endDate
    );

    // Use ASCII-safe keys for Convex compatibility
    const areaKeyMap: Record<string, "Cocina" | "Cafetin" | "Limpieza" | "Las casas"> = {
      Cocina: "Cocina",
      "Cafetin": "Cafetin",
      Limpieza: "Limpieza",
      "Las casas": "Las casas",
    };

    const consumption = {
      Cocina: 0,
      Cafetin: 0,
      Limpieza: 0,
      "Las casas": 0,
    };

    for (const order of orders) {
      const orderItems = await ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .collect();

      const totalQty = orderItems.reduce((sum, oi) => sum + oi.cantidad, 0);
      const key = areaKeyMap[order.area];
      consumption[key] += totalQty;
    }

    return consumption;
  },
});

export const getAreaConsumptionTrends = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    groupBy: v.optional(v.union(v.literal("day"), v.literal("week"), v.literal("month"))),
  },
  handler: async (ctx, args) => {
    const allOrders = await ctx.db.query("orders").collect();
    const orders = filterByDateRange(
      allOrders.filter((o) => o.status === "entregado"),
      args.startDate,
      args.endDate
    );
    const groupBy = args.groupBy || "day";

    // Use ASCII-safe keys for Convex compatibility
    const areaKeyMap: Record<string, "Cocina" | "Cafetin" | "Limpieza" | "Las casas"> = {
      Cocina: "Cocina",
      "Cafetin": "Cafetin",
      Limpieza: "Limpieza",
      "Las casas": "Las casas",
    };

    const trends = new Map<
      string,
      { Cocina: number; Cafetin: number; Limpieza: number; "Las casas": number }
    >();

    for (const order of orders) {
      const date = new Date(order.createdAt);
      let key: string;
      if (groupBy === "day") {
        key = date.toISOString().split("T")[0];
      } else if (groupBy === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      const orderItems = await ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .collect();

      const totalQty = orderItems.reduce((sum, oi) => sum + oi.cantidad, 0);

      const areaKey = areaKeyMap[order.area];
      const existing = trends.get(key) || { Cocina: 0, Cafetin: 0, Limpieza: 0, "Las casas": 0 };
      existing[areaKey] += totalQty;
      trends.set(key, existing);
    }

    const allKeys = Array.from(trends.keys()).sort();

    return allKeys.map((key) => ({
      period: key,
      ...trends.get(key)!,
    }));
  },
});

// Stock Runway Analytics

export const getInventoryRunway = query({
  args: {
    location: v.optional(v.union(v.literal("almacen"), v.literal("cafetin"))),
  },
  handler: async (ctx, args) => {
    const location = args.location ?? "almacen";
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Get all delivered orders from last 30 days using the index
    const allDeliveredOrders = await ctx.db
      .query("orders")
      .withIndex("by_status_createdAt", (q) =>
        q.eq("status", "entregado").gte("createdAt", thirtyDaysAgo)
      )
      .collect();

    // Filter orders by area based on location
    // - almacen: Cocina and Limpieza orders (these consume from almacen)
    // - cafetin: Cafetin orders (these consume from cafetin/POS)
    const deliveredOrders = allDeliveredOrders.filter((order) => {
      if (location === "cafetin") {
        return order.area === "Cafetin";
      } else {
        // almacen supplies Cocina, Limpieza and Camila
        return order.area === "Cocina" || order.area === "Limpieza" || order.area === "Las casas";
      }
    });

    // Aggregate consumption by productId
    const consumptionByProduct = new Map<string, number>();

    for (const order of deliveredOrders) {
      const orderItems = await ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .collect();

      for (const item of orderItems) {
        if (!item.productId) continue;
        const current = consumptionByProduct.get(item.productId) || 0;
        consumptionByProduct.set(item.productId, current + item.cantidad);
      }
    }

    // Get all active products
    const products = await ctx.db.query("products").collect();
    const productById = new Map(products.map((p) => [p._id, p]));

    // Get inventory for selected location - this determines which products to show
    const allInventory = await ctx.db
      .query("inventory")
      .withIndex("by_location", (q) => q.eq("location", location))
      .collect();

    // Only consider products that have inventory entries in this location
    const inventoryByProduct = new Map(
      allInventory.map((inv) => [inv.productId, inv.stockActual])
    );

    // Calculate runway for each product that has inventory in this location
    type RunwayStatus = "CRITICAL" | "WARNING" | "HEALTHY" | "STAGNANT";

    interface RunwayItem {
      productId: string;
      productName: string;
      stockCurrent: number;
      burnRate: number;
      daysRemaining: number | null;
      status: RunwayStatus;
    }

    const runwayItems: RunwayItem[] = [];

    // Only iterate over products that have inventory in this location
    for (const inv of allInventory) {
      const product = productById.get(inv.productId);
      if (!product || !product.active) continue;

      const stockCurrent = inv.stockActual;
      const totalConsumed = consumptionByProduct.get(inv.productId) ?? 0;
      const burnRate = totalConsumed / 30; // Daily consumption rate

      let daysRemaining: number | null = null;
      let status: RunwayStatus;

      if (burnRate === 0) {
        // No consumption in last 30 days
        status = "STAGNANT";
        daysRemaining = null;
      } else {
        daysRemaining = Math.round(stockCurrent / burnRate);

        if (daysRemaining < 10) {
          status = "CRITICAL";
        } else if (daysRemaining < 30) {
          status = "WARNING";
        } else {
          status = "HEALTHY";
        }
      }

      runwayItems.push({
        productId: inv.productId,
        productName: product.name,
        stockCurrent,
        burnRate: Math.round(burnRate * 100) / 100, // Round to 2 decimals
        daysRemaining,
        status,
      });
    }

    // Sort by status priority then by daysRemaining
    const statusOrder: Record<RunwayStatus, number> = {
      CRITICAL: 0,
      WARNING: 1,
      HEALTHY: 2,
      STAGNANT: 3,
    };

    runwayItems.sort((a, b) => {
      // First by status priority
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Then by daysRemaining (nulls last within same status)
      if (a.daysRemaining === null && b.daysRemaining === null) return 0;
      if (a.daysRemaining === null) return 1;
      if (b.daysRemaining === null) return -1;
      return a.daysRemaining - b.daysRemaining;
    });

    // Calculate summary stats
    const criticalCount = runwayItems.filter((i) => i.status === "CRITICAL").length;
    const warningCount = runwayItems.filter((i) => i.status === "WARNING").length;

    const itemsWithRunway = runwayItems.filter((i) => i.daysRemaining !== null);
    const averageDaysRemaining = itemsWithRunway.length > 0
      ? Math.round(
        itemsWithRunway.reduce((sum, i) => sum + (i.daysRemaining ?? 0), 0) /
        itemsWithRunway.length
      )
      : null;

    return {
      items: runwayItems,
      summary: {
        criticalCount,
        warningCount,
        healthyCount: runwayItems.filter((i) => i.status === "HEALTHY").length,
        stagnantCount: runwayItems.filter((i) => i.status === "STAGNANT").length,
        averageDaysRemaining,
        totalProducts: runwayItems.length,
      },
    };
  },
});

// ============================================================
// POS Weekly Report - Product breakdown by user (patient)
// ============================================================

export const getWeeklyPOSReport = query({
  args: {
    weekStart: v.number(), // Timestamp for week start (Monday 00:00)
    weekEnd: v.number(),   // Timestamp for week end (Sunday 23:59)
  },
  handler: async (ctx, args) => {
    // EFFICIENCY: Use by_timestamp index to filter movements by week range first
    const allMovements = await ctx.db
      .query("movements")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.weekStart).lte("timestamp", args.weekEnd)
      )
      .collect();

    // Filter for CONSUMO from CAFETIN (POS sales) - these have orderId
    const posMovements = allMovements.filter(
      (m) => m.type === "CONSUMO" && m.from === "CAFETIN" && m.orderId
    );

    if (posMovements.length === 0) {
      return {
        users: [],
        summary: {
          totalUsers: 0,
          totalProducts: 0,
          totalQuantity: 0,
        },
      };
    }

    // Get unique orderIds to fetch orders
    const orderIds = [...new Set(posMovements.map((m) => m.orderId!))];

    // Fetch all orders in parallel
    const orders = await Promise.all(orderIds.map((id) => ctx.db.get(id)));
    const orderMap = new Map(
      orders.filter((o) => o !== null).map((o) => [o!._id, o!])
    );

    // Get unique patientIds (users) from orders
    const patientIds = [
      ...new Set(
        orders
          .filter((o) => o !== null && o.patientId)
          .map((o) => o!.patientId!)
      ),
    ];

    // Fetch all users in parallel
    const users = await Promise.all(patientIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(
      users.filter((u) => u !== null).map((u) => [u!._id, u!.nombre])
    );

    // Get unique productIds
    const productIds = [...new Set(posMovements.map((m) => m.productId))];

    // Fetch all products in parallel
    const products = await Promise.all(productIds.map((id) => ctx.db.get(id)));
    const productMap = new Map(
      products.filter((p) => p !== null).map((p) => [p!._id, p!])
    );

    // Group consumption by user
    const userConsumption = new Map<
      string,
      {
        userId: string;
        userName: string;
        products: Map<string, { productName: string; quantity: number; unit: string }>;
      }
    >();

    for (const movement of posMovements) {
      const order = orderMap.get(movement.orderId!);
      if (!order) continue;

      const userId = order.patientId;
      const userName = userId ? userMap.get(userId) || "Sin asignar" : "Sin asignar";
      const userKey = userId || "unknown";

      const product = productMap.get(movement.productId);
      if (!product) continue;

      if (!userConsumption.has(userKey)) {
        userConsumption.set(userKey, {
          userId: userKey,
          userName,
          products: new Map(),
        });
      }

      const userEntry = userConsumption.get(userKey)!;
      const productKey = movement.productId;

      if (!userEntry.products.has(productKey)) {
        userEntry.products.set(productKey, {
          productName: product.name,
          quantity: 0,
          unit: product.baseUnit, // Always in baseUnit per requirements
        });
      }

      // Accumulate quantity
      const productEntry = userEntry.products.get(productKey)!;
      productEntry.quantity += movement.quantity;
    }

    // Convert to array format for frontend
    const usersArray = Array.from(userConsumption.values()).map((user) => ({
      userId: user.userId,
      userName: user.userName,
      products: Array.from(user.products.values()).sort((a, b) =>
        a.productName.localeCompare(b.productName)
      ),
      totalQuantity: Array.from(user.products.values()).reduce(
        (sum, p) => sum + p.quantity,
        0
      ),
    }));

    // Sort by user name
    usersArray.sort((a, b) => a.userName.localeCompare(b.userName));

    // Calculate summary
    const totalQuantity = usersArray.reduce((sum, u) => sum + u.totalQuantity, 0);
    const uniqueProducts = new Set(
      usersArray.flatMap((u) => u.products.map((p) => p.productName))
    ).size;

    return {
      users: usersArray,
      summary: {
        totalUsers: usersArray.length,
        totalProducts: uniqueProducts,
        totalQuantity,
      },
    };
  },
});
