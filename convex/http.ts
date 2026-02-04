import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Telegram Webhook Endpoint
 * Handles interactive commands: /bajo and /stock [nombre]
 */
http.route({
    path: "/telegram-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.json();

            // Extract message data from Telegram update
            const message = body.message;
            if (!message || !message.text) {
                return new Response("OK", { status: 200 });
            }

            const chatId = String(message.chat.id);
            const text = message.text.trim();

            // Security: Validate chat_id against authorized users
            const adminChatId = process.env.ADMIN_CHAT_ID;
            const warehouseManagerChatId = process.env.WAREHOUSE_MANAGER_CHAT_ID;

            const isAuthorized =
                (adminChatId && chatId === adminChatId) ||
                (warehouseManagerChatId && chatId === warehouseManagerChatId);

            if (!isAuthorized) {
                // Return 200 but don't process - prevents Telegram from retrying
                console.log(`Unauthorized chat_id: ${chatId}`);
                return new Response("OK", { status: 200 });
            }

            const telegramToken = process.env.TELEGRAM_TOKEN;
            if (!telegramToken) {
                console.error("TELEGRAM_TOKEN not configured");
                return new Response("OK", { status: 200 });
            }

            let responseText = "";

            // Handle /bajo command
            if (text === "/bajo" || text.startsWith("/bajo@")) {
                const inventoryWithProducts = await ctx.runQuery(
                    internal.inventory.internalListInventoryWithProducts
                );

                // Filter low stock items
                const lowStockItems = inventoryWithProducts.filter(
                    (inv: any) => inv.stockActual <= inv.stockMinimo
                );

                if (lowStockItems.length === 0) {
                    responseText = "✅ Todo el stock está por encima del mínimo operativo.";
                } else {
                    const lines = lowStockItems.map((inv: any) => {
                        const name = inv.product?.name || "Producto desconocido";
                        const unit = inv.product?.baseUnit || "u";
                        return `• ${name}: ${inv.stockActual} ${unit} (Mín: ${inv.stockMinimo})`;
                    });

                    responseText = `📋 PRODUCTOS POR REPONER:\n${lines.join("\n")}`;
                }
            }
            // Handle /stock command
            else if (text.startsWith("/stock")) {
                const searchName = text.replace(/^\/stock(@\w+)?/, "").trim();

                if (!searchName) {
                    responseText = "❌ Uso: /stock [nombre del producto]";
                } else {
                    const products = await ctx.runQuery(
                        internal.inventory.internalListProducts
                    );
                    const inventoryWithProducts = await ctx.runQuery(
                        internal.inventory.internalListInventoryWithProducts
                    );

                    const searchLower = searchName.toLowerCase();
                    const matchingProducts = products.filter((p: any) =>
                        p.name.toLowerCase().includes(searchLower)
                    );

                    if (matchingProducts.length === 0) {
                        responseText = `❌ No encontré el producto '${searchName}' en el inventario.`;
                    } else {
                        const responses: string[] = [];

                        for (const product of matchingProducts) {
                            const productInventory = inventoryWithProducts.filter(
                                (inv: any) => inv.productId === product._id
                            );

                            if (productInventory.length === 0) {
                                responses.push(
                                    `📦 STOCK ACTUAL:\nProducto: ${product.name}\nCantidad: 0 ${product.baseUnit}\nÁrea: Sin asignar`
                                );
                            } else {
                                for (const inv of productInventory) {
                                    const areaName = inv.location === "almacen" ? "Almacén" : "Cafetín";
                                    responses.push(
                                        `📦 STOCK ACTUAL:\nProducto: ${product.name}\nCantidad: ${inv.stockActual} ${product.baseUnit}\nÁrea: ${areaName}`
                                    );
                                }
                            }
                        }

                        responseText = responses.join("\n\n");
                    }
                }
            }
            // Unknown command - ignore
            else {
                return new Response("OK", { status: 200 });
            }

            // Send response to Telegram
            if (responseText) {
                await sendTelegramMessage(telegramToken, chatId, responseText);
            }

            return new Response("OK", { status: 200 });
        } catch (error) {
            console.error("Webhook error:", error);
            return new Response("OK", { status: 200 });
        }
    }),
});

/**
 * Send a message via Telegram API
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
            console.error(`Telegram API error: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error("Error sending Telegram message:", error);
    }
}

export default http;
