import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useInventoryStore } from '@/stores/inventoryStore';
import { Id } from 'convex/_generated/dataModel';

type ConvexProduct = {
  _id: Id<"products">;
  name: string;
  brand: string;
  category: string;
  subCategory?: string;
  baseUnit: string;
  purchaseUnit: string;
  conversionFactor: number;
  active: boolean;
  availableForSale?: boolean;
  totalStock: number;
  stockAlmacen: number;
  stockCafetin: number;
  status: "ok" | "bajo_stock";
  hasCafetinRecord?: boolean;
};

/**
 * Hook híbrido que retorna datos de Convex si están disponibles,
 * o datos del store de Zustand si Convex está offline/undefined.
 * Also syncs Convex data to the store (consolidating useInventorySync logic).
 */
export function useInventoryData(): ConvexProduct[] | undefined {
  const convexProducts = useQuery(api.products.listWithInventory);
  const cachedProducts = useInventoryStore((state) => state.products);
  const setProducts = useInventoryStore((state) => state.setProducts);
  const pendingActions = useInventoryStore((state) => state.pendingActions);

  // Sync to store when data arrives (consolidating useInventorySync logic)
  // Only sync if no pending actions to avoid overwriting optimistic updates
  useEffect(() => {
    if (convexProducts !== undefined && convexProducts !== null) {
      if (pendingActions.length === 0) {
        setProducts(convexProducts as ConvexProduct[]);
      }
    }
  }, [convexProducts, setProducts, pendingActions.length]);

  // Si Convex tiene datos, retornarlos
  if (convexProducts !== undefined && convexProducts !== null) {
    return convexProducts as ConvexProduct[];
  }

  // Si Convex está undefined (offline/cargando), retornar datos cacheados
  if (cachedProducts.length > 0) {
    return cachedProducts as ConvexProduct[];
  }

  // Si no hay datos ni en Convex ni en cache, retornar undefined
  // Esto solo pasa en la primera carga sin conexión
  return undefined;
}
