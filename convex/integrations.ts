import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const notifyNewCafetinProduct = internalAction({
    args: { producto: v.string() },
    handler: async (ctx, args) => {
        const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

        if (!webhookUrl) {
            console.error("Missing GOOGLE_SHEETS_WEBHOOK_URL environment variable.");
            return;
        }

        try {
            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ producto: args.producto }),
            });

            if (!response.ok) {
                throw new Error(`Webhook responded with status: ${response.status}`);
            }

            console.log(`Successfully notified webhook about new product: ${args.producto}`);
        } catch (error) {
            console.error("Failed to notify webhook:", error);
        }
    },
});
