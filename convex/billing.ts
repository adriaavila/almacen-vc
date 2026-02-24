import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { ActionCtx } from "./_generated/server";

// ============================================================
// DAILY RAW BILLING - Sends cafetín consumption data to n8n
// ============================================================

/**
 * Mutation: Record a cafetín sale item.
 * Called from POS when a sale is registered. Each item in the order
 * gets its own record with denormalized patient/product names.
 */
export const recordSale = mutation({
    args: {
        paciente: v.string(),
        producto: v.string(),
        cantidad: v.number(),
        orderId: v.optional(v.id("orders")),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("cafetin_sales", {
            paciente: args.paciente.trim(),
            producto: args.producto.trim(),
            cantidad: Number(args.cantidad),
            fecha: Date.now(),
            orderId: args.orderId,
            sentToN8n: false,
        });
    },
});

/**
 * Internal query: Get all unsent cafetín sales.
 */
export const getUnsentSales = internalQuery({
    handler: async (ctx) => {
        return await ctx.db
            .query("cafetin_sales")
            .withIndex("by_sentToN8n", (q) => q.eq("sentToN8n", false))
            .collect();
    },
});

/**
 * Query: Get daily report for a specific date (timestamp).
 * Returns all cafetín sales for that day.
 */
export const getDailyReport = query({
    args: { date: v.number() }, // Start of day timestamp
    handler: async (ctx, { date }) => {
        // Calculate start and end of the requested day
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch sales within the date range
        const sales = await ctx.db
            .query("cafetin_sales")
            .withIndex("by_fecha", (q) =>
                q.gte("fecha", startOfDay.getTime()).lte("fecha", endOfDay.getTime())
            )
            .collect();

        // Sort by time descending (newest first)
        return sales.sort((a, b) => b.fecha - a.fecha);
    },
});

/**
 * Query: Get sales report for a specific date range.
 * Returns all cafetín sales between startDate and endDate.
 */
export const getSalesByDateRange = query({
    args: { startDate: v.number(), endDate: v.number() },
    handler: async (ctx, { startDate, endDate }) => {
        const sales = await ctx.db
            .query("cafetin_sales")
            .withIndex("by_fecha", (q) =>
                q.gte("fecha", startDate).lte("fecha", endDate)
            )
            .collect();

        // Sort by time descending (newest first)
        return sales.sort((a, b) => b.fecha - a.fecha);
    },
});

/**
 * Internal mutation: Mark sales as sent after successful n8n POST.
 */
export const markSalesAsSent = internalMutation({
    args: { saleIds: v.array(v.id("cafetin_sales")) },
    handler: async (ctx, { saleIds }) => {
        for (const id of saleIds) {
            await ctx.db.patch(id, { sentToN8n: true });
        }
    },
});

/**
 * Mutation: Delete a sale record from the report.
 */
export const deleteSale = mutation({
    args: { id: v.id("cafetin_sales") },
    handler: async (ctx, { id }) => {
        await ctx.db.delete(id);
    },
});

/**
 * Core logic: Send unsent sales to n8n webhook.
 * Used by both the daily cron and the manual trigger.
 */
interface ISale {
    _id: string;
    paciente: string;
    producto: string;
    cantidad: number;
    fecha: number;
    sentToN8n: boolean;
}

interface SendResult {
    success: boolean;
    message?: string;
    error?: string;
    sent: number;
}

/**
 * Core logic: Send unsent sales to n8n webhook.
 * Used by both the daily cron and the manual trigger.
 */
async function sendRawToN8n(ctx: ActionCtx): Promise<SendResult> {
    // Get unsent sales
    const sales = await ctx.runQuery(internal.billing.getUnsentSales) as ISale[];

    if (sales.length === 0) {
        console.log("[Billing] No unsent cafetín sales found.");
        return { success: true, message: "No hay consumos pendientes", sent: 0 };
    }

    // Validate records
    const validSales = sales.filter(
        (s) => s.paciente && s.paciente.trim() !== "" &&
            s.producto && s.producto.trim() !== "" &&
            typeof s.cantidad === "number" && s.cantidad > 0
    );

    if (validSales.length === 0) {
        console.log("[Billing] All records failed validation.");
        return { success: true, message: "No hay consumos válidos pendientes", sent: 0 };
    }

    // Build RAW payload
    const now = new Date();
    const fechaReporte = now.toISOString().split("T")[0]; // YYYY-MM-DD

    const payload = {
        fecha_reporte: fechaReporte,
        generated_at: now.toISOString(),
        consumos: validSales.map((s) => ({
            fecha: new Date(s.fecha).toISOString(),
            paciente: s.paciente,
            cantidad: Number(s.cantidad),
            producto: s.producto,
        })),
    };

    // Send to n8n webhook
    const webhookUrl = process.env.N8N_WEBHOOK_URL ?? "https://n8n.servicioscreativos.online/webhook/cierre-cafetin";

    const attemptSend = async (): Promise<Response> => {
        return await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    };

    try {
        let response = await attemptSend();

        // Retry once on 5xx
        if (response.status >= 500) {
            console.log(`[Billing] Server error ${response.status}, retrying once...`);
            await new Promise((r) => setTimeout(r, 2000));
            response = await attemptSend();
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Billing] n8n webhook failed: ${response.status} - ${errorText}`);
            return {
                success: false,
                error: `Error del servidor: ${response.status}`,
                sent: 0,
            };
        }

        // Mark all valid sales as sent
        // Cast IDs to proper Convex ID type
        await ctx.runMutation(internal.billing.markSalesAsSent, {
            saleIds: validSales.map((s) => s._id as any),
        });

        console.log(`[Billing] Successfully sent ${validSales.length} RAW records to n8n`);
        return {
            success: true,
            message: `Enviados ${validSales.length} consumos`,
            sent: validSales.length,
        };
    } catch (error) {
        console.error("[Billing] Error sending to n8n:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error de conexión",
            sent: 0,
        };
    }
}

/**
 * Internal action: Daily cron handler.
 * Sends all unsent cafetín sales to n8n as RAW data.
 */
export const sendDailyRawData = internalAction({
    handler: async (ctx) => {
        return await sendRawToN8n(ctx);
    },
});

/**
 * Public action: Manual trigger from "Cerrar día" button.
 */
export const triggerDailySend = action({
    handler: async (ctx) => {
        return await sendRawToN8n(ctx);
    },
});
