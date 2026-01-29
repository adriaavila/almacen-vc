import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Envía una notificación de Telegram cuando se crea un nuevo pedido
 */
export const sendNotification = internalAction({
  args: {
    orderId: v.id("orders"),
    area: v.union(v.literal("Cocina"), v.literal("Cafetin"), v.literal("Limpieza")),
    createdAt: v.number(),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.ADMIN_CHAT_ID;

    // Validar que las variables de entorno estén configuradas
    if (!token || !chatId) {
      console.error(
        "TELEGRAM_TOKEN o ADMIN_CHAT_ID no están configuradas. No se puede enviar notificación."
      );
      return;
    }

    // Calcular el número de orden real basado en el orden cronológico
    // Contar pedidos anteriores (createdAt <) y sumar 1 para el pedido actual
    const allOrders = await ctx.runQuery(internal.orders.internalList);
    const orderNumber = allOrders.filter(
      (o) => o.createdAt < args.createdAt
    ).length + 1;

    // Construir el mensaje HTML
    const itemsText = args.items
      .map((item) => `${item.quantity} ${item.name}`)
      .join("\n");

    const message = `🚨 NUEVO PEDIDO VISTACAMPO 🚨
Orden: #${orderNumber}
Solicitado por: ${args.area}
Productos:

${itemsText}`;

    try {
      // Enviar mensaje a Telegram API
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Error al enviar notificación de Telegram: ${response.status} - ${errorText}`
        );
      }
    } catch (error) {
      // Loggear el error pero no lanzar excepción para no afectar el flujo principal
      console.error("Error al enviar notificación de Telegram:", error);
    }
  },
});
