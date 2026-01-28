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
};

/**
 * Hook híbrido que retorna datos de Convex si están disponibles,
 * o datos del store de Zustand si Convex está offline/undefined
 */
export function useInventoryData(): ConvexProduct[] | undefined {
  const convexProducts = useQuery(api.products.listWithInventory);
  const cachedProducts = useInventoryStore((state) => state.products);

  // Si Convex tiene datos, retornarlos (y se sincronizarán al store automáticamente)
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
