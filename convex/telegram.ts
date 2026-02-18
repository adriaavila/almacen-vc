import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Helper to send a message to a list of Chat IDs
 */
async function sendTelegramMessage(token: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error sending Telegram to ${chatId}: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error(`Error sending Telegram to ${chatId}:`, error);
  }
}

/**
 * Get recipients based on a preference key (or 'always' for general messages)
 */
async function getRecipients(ctx: any, preferenceKey?: "lowStock" | "weeklyReport" | "newOrders") {
  // 1. Get recipients from DB
  const settings = await ctx.runQuery((internal as any).notifications.list);
  const token = process.env.TELEGRAM_TOKEN;

  if (!token) {
    console.error("TELEGRAM_TOKEN not configured.");
    return { token: null, targets: [] };
  }

  // 2. Filter recipients from DB
  let targets: string[] = [];

  if (settings.length > 0) {
    targets = settings
      .filter((s: any) => s.enabled && (!preferenceKey || s.preferences[preferenceKey]))
      .map((s: any) => s.chatId);
  }

  // 3. Add Fixed Recipients (Env Vars)
  // The user requested that ADMIN_CHAT_ID and WAREHOUSE_MANAGER_CHAT_ID always receive 'Nuevo Pedido' and 'Stock Bajo'.
  // We'll add them to the targets list if the env vars are present.
  const adminChatId = process.env.ADMIN_CHAT_ID;
  const warehouseManagerChatId = process.env.WAREHOUSE_MANAGER_CHAT_ID;

  if (adminChatId) {
    targets.push(adminChatId);
  }

  if (warehouseManagerChatId) {
    targets.push(warehouseManagerChatId);
  }

  // 4. Deduplicate targets
  targets = Array.from(new Set(targets));

  return { token, targets };
}

/**
 * Envía una notificación de Telegram cuando se crea un nuevo pedido
 */
export const sendNotification = internalAction({
  args: {
    orderId: v.id("orders"),
    area: v.union(v.literal("Cocina"), v.literal("Cafetin"), v.literal("Limpieza"), v.literal("Las casas")),
    createdAt: v.number(),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Calcular número de orden
    const allOrders = await ctx.runQuery(internal.orders.internalList);
    const orderNumber = allOrders.filter((o) => o.createdAt < args.createdAt).length + 1;

    const itemsText = args.items
      .map((item) => `${item.quantity} ${item.name}`)
      .join("\n");

    const message = `🚨 NUEVO PEDIDO VISTACAMPO 🚨
Orden: #${orderNumber}
Solicitado por: ${args.area}
Productos:

${itemsText}`;

    // Send to recipients with 'newOrders' preference (assuming we add that or default to all active)
    // Using 'newOrders' as key
    const { token, targets } = await getRecipients(ctx, "newOrders");

    if (!token || targets.length === 0) return;

    await Promise.all(targets.map((chatId) => sendTelegramMessage(token, chatId, message)));
  },
});

/**
 * Sends a generic message (treated as High Priority / System Message)
 */
export const sendMessage = internalAction({
  args: {
    message: v.string(),
    type: v.optional(v.union(v.literal("lowStock"), v.literal("weeklyReport"), v.literal("general"))),
  },
  handler: async (ctx, args) => {
    const type = args.type || "general";
    const preferenceKey = type === "lowStock" ? "lowStock" : type === "weeklyReport" ? "weeklyReport" : undefined;

    const { token, targets } = await getRecipients(ctx, preferenceKey as any);

    if (!token || targets.length === 0) return;

    await Promise.all(targets.map((chatId) => sendTelegramMessage(token, chatId, args.message)));
  },
});

/**
 * Generates and sends a weekly report of items with low stock
 */
export const sendWeeklyLowStockReport = internalAction({
  args: {},
  handler: async (ctx) => {
    const lowStockItems = await ctx.runQuery((internal as any).inventory.getLowStock, {
      location: "almacen",
    });

    if (lowStockItems.length === 0) {
      return;
    }

    const lines = lowStockItems.map((item: any) => {
      const productName = item.product?.name || "Producto desconocido";
      const unit = item.product?.baseUnit || "u";
      return `- ${productName}: ${item.stockActual} ${unit} (Min: ${item.stockMinimo})`;
    });

    const message = `📋 <b>REPORTE SEMANAL DE REPOSICIÓN</b>

Se detectaron los siguientes productos con stock bajo o nulo:

${lines.join("\n")}

<i>Por favor verificar inventario.</i>`;

    // Send directly
    const { token, targets } = await getRecipients(ctx, "weeklyReport");

    if (!token || targets.length === 0) return;

    await Promise.all(targets.map((chatId) => sendTelegramMessage(token, chatId, message)));
  },
}); 
