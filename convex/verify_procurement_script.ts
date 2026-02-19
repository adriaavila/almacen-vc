
import { api } from "./_generated/api";

export const verifyOrder = async (ctx: any) => {
    const orders = await ctx.runQuery(api.procurement.listPendingOrders);
    if (orders.length === 0) {
        console.log("No pending orders found");
        return;
    }

    const orderId = orders[0]._id;
    console.log(`Checking order ${orderId}`);

    const fullOrder = await ctx.runQuery(api.procurement.getOrderWithItems, { orderId });
    console.log(`Order has ${fullOrder.items.length} items`);

    fullOrder.items.forEach((item: any) => {
        console.log(`Item: ${item.cantidadSolicitada} - Product: ${item.product ? item.product.name : 'NULL'}`);
    });
};
