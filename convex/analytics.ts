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
    const areaKeyMap: Record<string, "Cocina" | "Cafetin" | "Limpieza"> = {
      Cocina: "Cocina",
      "Cafetin": "Cafetin",
      Limpieza: "Limpieza",
    };
    
    const ordersByArea = {
      Cocina: { count: 0, totalQuantity: 0 },
      Cafetin: { count: 0, totalQuantity: 0 },
      Limpieza: { count: 0, totalQuantity: 0 },
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
    const allOrders = await ctx.db.query("orders").collect();
    const deliveredOrders = filterByDateRange(
      allOrders.filter((o) => o.status === "entregado"),
      args.startDate,
      args.endDate
    );
    
    if (deliveredOrders.length === 0) {
      return { averageHours: 0, averageDays: 0, count: 0 };
    }
    
    // Calculate delivery time - approximate using order creation vs current time
    // In a real scenario, we'd track delivery timestamps
    const times: number[] = [];
    
    for (const order of deliveredOrders) {
      // Use movements table - look for CONSUMO or TRASLADO movements related to this order
      // Note: movements table doesn't have referencia field, so we approximate using timestamp
      // In production, you'd want to track actual delivery time
      const movements = await ctx.db
        .query("movements")
        .withIndex("by_timestamp", (q) => q.gte("timestamp", order.createdAt))
        .collect();
      
      // Find movements that occurred after order creation (approximation)
      const relevantMovements = movements.filter(m => 
        (m.type === "CONSUMO" || m.type === "TRASLADO") &&
        m.timestamp >= order.createdAt &&
        m.timestamp <= order.createdAt + 7 * 24 * 60 * 60 * 1000 // Within 7 days
      );
      
      if (relevantMovements.length > 0) {
        // Use first movement timestamp as delivery time approximation
        const deliveryTime = relevantMovements[0].timestamp - order.createdAt;
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
    const areaKeyMap: Record<string, "Cocina" | "Cafetin" | "Limpieza"> = {
      Cocina: "Cocina",
      "Cafetin": "Cafetin",
      Limpieza: "Limpieza",
    };
    
    const consumption = {
      Cocina: 0,
      Cafetin: 0,
      Limpieza: 0,
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
    const areaKeyMap: Record<string, "Cocina" | "Cafetin" | "Limpieza"> = {
      Cocina: "Cocina",
      "Cafetin": "Cafetin",
      Limpieza: "Limpieza",
    };
    
    const trends = new Map<
      string,
      { Cocina: number; Cafetin: number; Limpieza: number }
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
      const existing = trends.get(key) || { Cocina: 0, Cafetin: 0, Limpieza: 0 };
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
