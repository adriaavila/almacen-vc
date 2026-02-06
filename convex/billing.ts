import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ============================================================
// WEEKLY BILLING - Exports Cafetín consumption data to n8n
// ============================================================

/**
 * Internal query to get weekly Cafetin orders with their items.
 * Fetches orders with status "entregado" from the Cafetin area
 * within the specified date range.
 */
export const getWeeklyOrders = internalQuery({
    args: { startDate: v.number(), endDate: v.number() },
    handler: async (ctx, { startDate, endDate }) => {
        // Get all orders from Cafetin with status entregado
        const orders = await ctx.db
            .query("orders")
            .withIndex("by_area_status", (q) =>
                q.eq("area", "Cafetin").eq("status", "entregado")
            )
            .collect();

        // Filter by date range
        const filteredOrders = orders.filter(
            (o) => o.createdAt >= startDate && o.createdAt <= endDate
        );

        // Get order items and patient info for each order
        const ordersWithDetails = await Promise.all(
            filteredOrders.map(async (order) => {
                // Get patient info if patientId exists
                let patientName = "Sin asignar";
                if (order.patientId) {
                    const patient = await ctx.db.get(order.patientId);
                    if (patient) {
                        patientName = patient.nombre;
                    }
                }

                // Get order items
                const orderItems = await ctx.db
                    .query("orderItems")
                    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
                    .collect();

                // Get product names for each item
                const items = await Promise.all(
                    orderItems.map(async (oi) => {
                        if (!oi.productId) return null;
                        const product = await ctx.db.get(oi.productId);
                        if (!product) return null;
                        return {
                            name: product.name,
                            qty: oi.cantidad,
                        };
                    })
                );

                return {
                    patientId: order.patientId,
                    patientName,
                    items: items.filter((i) => i !== null),
                };
            })
        );

        return ordersWithDetails;
    },
});

/**
 * Internal action that runs weekly to export Cafetín consumption data.
 * - Calculates date range (last 7 days)
 * - Queries Cafetin orders with status "entregado"
 * - Groups items by patient and aggregates quantities
 * - Sends payload to n8n webhook for Google Sheets generation
 */
export const sendWeeklyData = internalAction({
    handler: async (ctx) => {
        // Calculate date range (last 7 days)
        const now = Date.now();
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

        // Get weekly orders using internal query
        const ordersData = await ctx.runQuery(internal.billing.getWeeklyOrders, {
            startDate: sevenDaysAgo,
            endDate: now,
        });

        // If no orders, log and exit
        if (ordersData.length === 0) {
            console.log("[Billing] No Cafetin orders found for this week.");
            return { success: true, message: "No orders to process" };
        }

        // Group by patientId and aggregate product quantities
        const patientMap: Map<
            string,
            {
                patientName: string;
                products: Map<string, number>; // productName -> totalQty
            }
        > = new Map();

        for (const order of ordersData) {
            const key = order.patientId ?? "unassigned";

            if (!patientMap.has(key)) {
                patientMap.set(key, {
                    patientName: order.patientName,
                    products: new Map(),
                });
            }

            const patientData = patientMap.get(key)!;

            for (const item of order.items) {
                const currentQty = patientData.products.get(item.name) ?? 0;
                patientData.products.set(item.name, currentQty + item.qty);
            }
        }

        // Format week label
        const startDate = new Date(sevenDaysAgo);
        const endDate = new Date(now);
        const formatDate = (d: Date) =>
            `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        const weekLabel = `Semana del ${formatDate(startDate)} al ${formatDate(endDate)}`;

        // Build payload
        const payload = Array.from(patientMap.entries()).map(
            ([_key, patientData]) => ({
                patientName: patientData.patientName,
                weekLabel,
                items: Array.from(patientData.products.entries()).map(
                    ([name, qty]) => ({
                        name,
                        qty,
                    })
                ),
            })
        );

        // Send to n8n webhook
        const webhookUrl = process.env.N8N_WEBHOOK_URL;
        if (!webhookUrl) {
            console.error("[Billing] N8N_WEBHOOK_URL environment variable not set!");
            return { success: false, error: "N8N_WEBHOOK_URL not configured" };
        }

        try {
            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(
                    `[Billing] n8n webhook failed: ${response.status} - ${errorText}`
                );
                return {
                    success: false,
                    error: `Webhook failed: ${response.status}`,
                };
            }

            console.log(
                `[Billing] Successfully sent ${payload.length} patient records to n8n`
            );
            return {
                success: true,
                message: `Sent ${payload.length} patient records`,
                patientsProcessed: payload.length,
            };
        } catch (error) {
            console.error("[Billing] Error sending to n8n:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    },
});
