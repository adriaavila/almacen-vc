import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Id } from 'convex/_generated/dataModel';

export type InventoryProduct = {
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
  lastSyncedAt?: number; // Timestamp de última sincronización
};

// Tipos para acciones pendientes
export type PendingAction = 
  | {
      id: string; // UUID único
      type: 'updateStock';
      mutation: 'api.inventory.updateStock';
      args: {
        productId: Id<"products">;
        location: "almacen" | "cafetin";
        newStock: number;
        user: string;
        reason?: string;
      };
      timestamp: number;
      optimisticUpdate: {
        productId: Id<"products">;
        location: "almacen" | "cafetin";
        newStock: number;
      };
    }
  | {
      id: string;
      type: 'transfer';
      mutation: 'api.inventory.transfer';
      args: {
        productId: Id<"products">;
        from: "almacen" | "cafetin";
        to: "almacen" | "cafetin";
        quantity: number;
        user: string;
      };
      timestamp: number;
      optimisticUpdate: {
        productId: Id<"products">;
        from: "almacen" | "cafetin";
        to: "almacen" | "cafetin";
        quantity: number;
      };
    }
  | {
      id: string;
      type: 'setMinStock';
      mutation: 'api.inventory.setMinStock';
      args: {
        productId: Id<"products">;
        location: "almacen" | "cafetin";
        stockMinimo: number;
      };
      timestamp: number;
    }
  | {
      id: string;
      type: 'createOrder';
      mutation: 'api.orders.create';
      args: {
        area: "Cocina" | "Cafetín" | "Limpieza";
        items: Array<{ itemId?: Id<"items">; productId?: Id<"products">; cantidad: number }>;
      };
      timestamp: number;
    }
  | {
      id: string;
      type: 'deliverOrder';
      mutation: 'api.orders.deliver';
      args: {
        id: Id<"orders">;
      };
      timestamp: number;
    };

interface InventoryState {
  products: InventoryProduct[];
  setProducts: (products: InventoryProduct[]) => void;
  clearProducts: () => void;
  getProducts: () => InventoryProduct[];
  pendingActions: PendingAction[];
  addPendingAction: (action: Omit<PendingAction, 'id' | 'timestamp'>) => string; // Returns action ID
  removePendingAction: (actionId: string) => void;
  clearPendingActions: () => void;
  updateProductOptimistically: (update: {
    productId: Id<"products">;
    location?: "almacen" | "cafetin";
    stockAlmacen?: number;
    stockCafetin?: number;
    totalStock?: number;
    status?: "ok" | "bajo_stock";
  }) => void;
}

// Función helper para generar UUID simple
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      products: [],
      setProducts: (products) => set({ 
        products: products.map(p => ({ 
          ...p, 
          lastSyncedAt: Date.now() 
        })) 
      }),
      clearProducts: () => set({ products: [] }),
      getProducts: () => get().products,
      pendingActions: [],
      addPendingAction: (action) => {
        const id = generateId();
        const pendingAction: PendingAction = {
          ...action,
          id,
          timestamp: Date.now(),
        } as PendingAction;
        set((state) => ({
          pendingActions: [...state.pendingActions, pendingAction],
        }));
        return id;
      },
      removePendingAction: (actionId) => {
        set((state) => ({
          pendingActions: state.pendingActions.filter((a) => a.id !== actionId),
        }));
      },
      clearPendingActions: () => {
        set({ pendingActions: [] });
      },
      updateProductOptimistically: (update) => {
        set((state) => ({
          products: state.products.map((p) => {
            if (p._id !== update.productId) return p;
            
            const updated = { ...p };
            if (update.stockAlmacen !== undefined) {
              updated.stockAlmacen = update.stockAlmacen;
            }
            if (update.stockCafetin !== undefined) {
              updated.stockCafetin = update.stockCafetin;
            }
            if (update.totalStock !== undefined) {
              updated.totalStock = update.totalStock;
            } else {
              // Recalcular totalStock
              updated.totalStock = 
                (update.stockAlmacen ?? updated.stockAlmacen) + 
                (update.stockCafetin ?? updated.stockCafetin);
            }
            if (update.status !== undefined) {
              updated.status = update.status;
            }
            return updated;
          }),
        }));
      },
    }),
    {
      name: 'inventory-storage', // localStorage key
      version: 1,
    }
  )
);
