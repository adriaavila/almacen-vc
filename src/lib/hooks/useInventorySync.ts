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
  totalStock: number;
  stockAlmacen: number;
  stockCafetin: number;
  status: "ok" | "bajo_stock";
};

export function useInventorySync() {
  const convexProducts = useQuery(api.products.listWithInventory);
  const setProducts = useInventoryStore((state) => state.setProducts);
  const pendingActions = useInventoryStore((state) => state.pendingActions);

  useEffect(() => {
    // Cuando hay datos de Convex, sincronizar al store
    // PERO solo si no hay acciones pendientes (para evitar sobrescribir optimistas)
    if (convexProducts !== undefined && convexProducts !== null) {
      // Si hay acciones pendientes, esperar a que se procesen
      // Las acciones pendientes se procesarán y luego Convex devolverá datos actualizados
      if (pendingActions.length === 0) {
        setProducts(convexProducts as ConvexProduct[]);
      }
      // Si hay acciones pendientes, el OfflineSyncManager las procesará
      // y luego useInventorySync sincronizará los datos actualizados automáticamente
    }
  }, [convexProducts, setProducts, pendingActions.length]);
}
