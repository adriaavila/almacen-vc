import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useInventoryStore } from '@/stores/inventoryStore';
import { Id } from 'convex/_generated/dataModel';

type UpdateStockArgs = {
  productId: Id<"products">;
  location: "almacen" | "cafetin";
  newStock: number;
  user: string;
  reason?: string;
};

type TransferArgs = {
  productId: Id<"products">;
  from: "almacen" | "cafetin";
  to: "almacen" | "cafetin";
  quantity: number;
  user: string;
};

type SetMinStockArgs = {
  productId: Id<"products">;
  location: "almacen" | "cafetin";
  stockMinimo: number;
};

type CreateOrderArgs = {
  area: "Cocina" | "Cafetin" | "Limpieza" | "Las casas";
  items: Array<{ productId: Id<"products">; cantidad: number }>;
  patientId?: Id<"users">;
};

type PosSaleArgs = {
  patientId?: Id<"users">;
  items: Array<{ productId: Id<"products">; cantidad: number }>;
};

type DeliverOrderArgs = {
  id: Id<"orders">;
};

type MutationType = 'updateStock' | 'transfer' | 'setMinStock' | 'createOrder' | 'deliverOrder' | 'posSale';

/**
 * Hook que envuelve mutaciones de Convex para soportar modo offline
 * Si está offline, actualiza el store optimísticamente y encola la acción
 * Si está online, ejecuta la mutación directamente
 */
export function useOfflineMutation(mutationType: MutationType) {
  // Select the appropriate Convex mutation based on type
  // access actual mutations but we only use them in the SyncManager or if we want to force sync
  // For this hook, we only care about the Queue and Store.

  const addPendingAction = useInventoryStore((state) => state.addPendingAction);
  const updateProductOptimistically = useInventoryStore(
    (state) => state.updateProductOptimistically
  );
  const getProducts = useInventoryStore((state) => state.getProducts);

  return async (args: any): Promise<any> => {
    // ALWAYS Optimistic First Strategy
    // We do not wait for the network. We update local state and queue the action.
    // The OfflineSyncManager will handle the actual network request.

    let optimisticUpdate: any = {};

    if (mutationType === 'updateStock') {
      const updateArgs = args as UpdateStockArgs;
      const products = getProducts();
      const product = products.find((p) => p._id === updateArgs.productId);

      if (product) {
        const newStockAlmacen =
          updateArgs.location === 'almacen' ? updateArgs.newStock : product.stockAlmacen;
        const newStockCafetin =
          updateArgs.location === 'cafetin' ? updateArgs.newStock : product.stockCafetin;

        // Visual Optimistic Update
        updateProductOptimistically({
          productId: updateArgs.productId,
          stockAlmacen: newStockAlmacen,
          stockCafetin: newStockCafetin,
        });

        optimisticUpdate = {
          productId: updateArgs.productId,
          location: updateArgs.location,
          newStock: updateArgs.newStock,
        };
      }
    } else if (mutationType === 'transfer') {
      const transferArgs = args as TransferArgs;
      const products = getProducts();
      const product = products.find((p) => p._id === transferArgs.productId);

      if (product) {
        const newStockFrom =
          transferArgs.from === 'almacen'
            ? product.stockAlmacen - transferArgs.quantity
            : product.stockCafetin - transferArgs.quantity;
        const newStockTo =
          transferArgs.to === 'almacen'
            ? product.stockAlmacen + transferArgs.quantity
            : product.stockCafetin + transferArgs.quantity;

        // Visual Optimistic Update
        updateProductOptimistically({
          productId: transferArgs.productId,
          stockAlmacen: transferArgs.from === 'almacen'
            ? newStockFrom
            : transferArgs.to === 'almacen'
              ? newStockTo
              : product.stockAlmacen,
          stockCafetin: transferArgs.from === 'cafetin'
            ? newStockFrom
            : transferArgs.to === 'cafetin'
              ? newStockTo
              : product.stockCafetin,
        });

        optimisticUpdate = {
          productId: transferArgs.productId,
          from: transferArgs.from,
          to: transferArgs.to,
          quantity: transferArgs.quantity,
        };
      }
    } else if (mutationType === 'createOrder') {
      const orderArgs = args as CreateOrderArgs;
      // No optimistic stock updates for warehouse orders
    } else if (mutationType === 'posSale') {
      // POS sale: update stock immediately for "checkout" feel
      const saleArgs = args as PosSaleArgs;
      const products = getProducts();

      for (const item of saleArgs.items) {
        const product = products.find((p) => p._id === item.productId);
        if (product) {
          updateProductOptimistically({
            productId: item.productId,
            stockCafetin: Math.max(0, product.stockCafetin - item.cantidad),
            stockAlmacen: product.stockAlmacen,
          });
        }
      }
    }

    // Prepare Action for Queue
    const actionToAdd: any = {
      type: mutationType,
      mutation: mutationType === 'createOrder' ? 'api.orders.create' :
        mutationType === 'deliverOrder' ? 'api.orders.deliver' :
          mutationType === 'posSale' ? 'api.pos.registerSale' :
            `api.inventory.${mutationType}` as any,
      args: args as any,
    };

    if (Object.keys(optimisticUpdate).length > 0) {
      actionToAdd.optimisticUpdate = optimisticUpdate;
    }

    // Add to Store Queue (Disk Persistence)
    const actionId = addPendingAction(actionToAdd);

    // Return "Success" immediately to the UI
    // The UI should treat this as "Done"
    return { success: true, queued: true, actionId };
  };
}

