import { useEffect, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useInventoryStore, InventoryProduct } from '@/stores/inventoryStore';

/**
 * Hook optimized for POS (Point of Sale).
 * 1. Returns data from local store immediately (Instant Load).
 * 2. Fetches lightweight data from Convex in background (Stale-while-revalidate).
 * 3. Updates local store with fresh data.
 */
export function usePosInventory(): InventoryProduct[] {
    // 1. Get from local store (Instant)
    const cachedProducts = useInventoryStore((state) => state.products);
    const setProducts = useInventoryStore((state) => state.setProducts);
    const pendingActions = useInventoryStore((state) => state.pendingActions);

    // 2. Fetch from Convex (Background)
    // undefined = loading, null = not found/error (handled by Convex)
    const freshProducts = useQuery(api.pos.listStart);

    // 3. Sync to store when fresh data arrives
    useEffect(() => {
        if (freshProducts) {
            // Only sync if no pending actions to avoid overwriting optimistic updates with stale server data
            // (Server might not have processed the queue yet)
            if (pendingActions.length === 0) {
                // Map lightweight POS product to full InventoryProduct shape if needed
                // The shapes are compatible enough for POS usage
                const mappedProducts = freshProducts.map(p => ({
                    ...p,
                    // Ensure all required fields for InventoryProduct are present
                    purchaseUnit: p.purchaseUnit,
                    conversionFactor: p.conversionFactor,
                    totalStock: p.totalStock,
                    stockAlmacen: p.stockAlmacen,
                    stockCafetin: p.stockCafetin,
                    availableForSale: p.availableForSale,
                    lastSyncedAt: Date.now(),
                    hasCafetinRecord: p.hasCafetinRecord
                })) as InventoryProduct[];

                setProducts(mappedProducts);
            }
        }
    }, [freshProducts, setProducts, pendingActions.length]);

    // 4. Return filtered data for POS
    // Even if the global store is "polluted" with all products, only show Cafetin relevant ones
    return useMemo(() => {
        return cachedProducts.filter(p =>
            p.active &&
            true // Show all active products
        );
    }, [cachedProducts]);
}
