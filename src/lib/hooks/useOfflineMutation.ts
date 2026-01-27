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

/**
 * Hook que envuelve mutaciones de Convex para soportar modo offline
 * Si está offline, actualiza el store optimísticamente y encola la acción
 * Si está online, ejecuta la mutación directamente
 */
export function useOfflineMutation(
  mutationType: 'updateStock' | 'transfer' | 'setMinStock'
) {
  const convexMutation = useMutation(
    mutationType === 'updateStock' ? api.inventory.updateStock :
    mutationType === 'transfer' ? api.inventory.transfer :
    api.inventory.setMinStock
  );
  const addPendingAction = useInventoryStore((state) => state.addPendingAction);
  const updateProductOptimistically = useInventoryStore(
    (state) => state.updateProductOptimistically
  );
  const getProducts = useInventoryStore((state) => state.getProducts);

  return async (args: any): Promise<any> => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Si estamos online, ejecutar directamente
    if (isOnline) {
      try {
        return await convexMutation(args);
      } catch (error) {
        throw error;
      }
    }

    // Si estamos offline, actualizar optimísticamente y encolar
    let optimisticUpdate: any = {};

    if (mutationType === 'updateStock') {
      const updateArgs = args as UpdateStockArgs;
      const products = getProducts();
      const product = products.find((p) => p._id === updateArgs.productId);
      
      if (!product) {
        // Producto no encontrado en cache - aún así encolar la acción
        // pero mostrar advertencia en consola
        console.warn(
          'useOfflineMutation: Product not found in cache, action will be queued:',
          updateArgs.productId
        );
        // No hacer actualización optimista, pero aún encolar la acción
        optimisticUpdate = {
          productId: updateArgs.productId,
          location: updateArgs.location,
          newStock: updateArgs.newStock,
        };
      } else {
        const newStockAlmacen = 
          updateArgs.location === 'almacen' ? updateArgs.newStock : product.stockAlmacen;
        const newStockCafetin = 
          updateArgs.location === 'cafetin' ? updateArgs.newStock : product.stockCafetin;
        
        // Actualizar optimísticamente
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
      
      if (!product) {
        // Producto no encontrado en cache
        console.warn(
          'useOfflineMutation: Product not found in cache for transfer, action will be queued:',
          transferArgs.productId
        );
        optimisticUpdate = {
          productId: transferArgs.productId,
          from: transferArgs.from,
          to: transferArgs.to,
          quantity: transferArgs.quantity,
        };
      } else {
        const newStockFrom = 
          transferArgs.from === 'almacen' 
            ? product.stockAlmacen - transferArgs.quantity
            : product.stockCafetin - transferArgs.quantity;
        const newStockTo = 
          transferArgs.to === 'almacen'
            ? product.stockAlmacen + transferArgs.quantity
            : product.stockCafetin + transferArgs.quantity;

        // Actualizar optimísticamente
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
    }

    // Encolar acción
    const actionToAdd: any = {
      type: mutationType,
      mutation: `api.inventory.${mutationType}` as any,
      args: args as any,
    };
    
    // Solo incluir optimisticUpdate para tipos que lo soportan
    if (mutationType === 'updateStock' || mutationType === 'transfer') {
      actionToAdd.optimisticUpdate = optimisticUpdate;
    }
    
    const actionId = addPendingAction(actionToAdd);

    return { actionId, queued: true };
  };
}
