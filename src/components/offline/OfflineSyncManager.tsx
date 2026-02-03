'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { useInventoryStore, PendingAction } from '@/stores/inventoryStore';
import { useUsersStore } from '@/stores/usersStore';

/**
 * Component that handles background data sync and pre-fetching
 * for offline access
 */
export function OfflineSyncManager() {
  const pendingActions = useInventoryStore((state) => state.pendingActions);
  const isProcessingRef = useRef(false);
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // Prefetch data hooks - these automatically update the stores
  // defined in their respective files (useInventorySync logic)
  usePrefetchData(isOnline);

  // Mutaciones necesarias
  const updateStock = useMutation(api.inventory.updateStock);
  const transfer = useMutation(api.inventory.transfer);
  const setMinStock = useMutation(api.inventory.setMinStock);
  const createOrder = useMutation(api.orders.create);
  const deliverOrder = useMutation(api.orders.deliver);

  const processQueue = useCallback(async () => {
    // Leer pendingActions dentro del callback usando getState para evitar dependencias innecesarias
    const currentPendingActions = useInventoryStore.getState().pendingActions;
    const removePendingActionFn = useInventoryStore.getState().removePendingAction;

    if (isProcessingRef.current || currentPendingActions.length === 0) return;

    // Verificar conexión antes de procesar
    if (!navigator.onLine) {
      console.log('OfflineSyncManager: No connection, skipping queue processing');
      return;
    }

    isProcessingRef.current = true;
    const actionsToProcess = [...currentPendingActions].sort((a, b) => a.timestamp - b.timestamp);

    console.log(`OfflineSyncManager: Processing ${actionsToProcess.length} queued actions`);

    for (const action of actionsToProcess) {
      try {
        // Validar que la acción tenga los argumentos necesarios
        if (!action.args) {
          console.error('OfflineSyncManager: Action missing args:', action);
          continue;
        }

        let result;

        switch (action.type) {
          case 'updateStock':
            // Validar argumentos de updateStock
            if (!action.args.productId || typeof action.args.newStock !== 'number') {
              console.error('OfflineSyncManager: Invalid updateStock args:', action.args);
              continue;
            }
            result = await updateStock(action.args);
            break;
          case 'transfer':
            // Validar argumentos de transfer
            if (!action.args.productId || typeof action.args.quantity !== 'number') {
              console.error('OfflineSyncManager: Invalid transfer args:', action.args);
              continue;
            }
            result = await transfer(action.args);
            break;
          case 'setMinStock':
            // Validar argumentos de setMinStock
            if (!action.args.productId || typeof action.args.stockMinimo !== 'number') {
              console.error('OfflineSyncManager: Invalid setMinStock args:', action.args);
              continue;
            }
            result = await setMinStock(action.args);
            break;
          case 'createOrder':
            if (!action.args.area || !Array.isArray(action.args.items)) {
              console.error('OfflineSyncManager: Invalid createOrder args:', action.args);
              continue;
            }
            // Validate area is one of the allowed values
            const validAreas = ["Cocina", "Cafetin", "Limpieza"] as const;
            if (!validAreas.includes(action.args.area as typeof validAreas[number])) {
              console.error('OfflineSyncManager: Invalid area value:', action.args.area);
              continue;
            }
            result = await createOrder(action.args as {
              area: "Cocina" | "Cafetin" | "Limpieza";
              items: Array<{ productId: Id<"products">; cantidad: number }>;
            });
            break;
          case 'deliverOrder':
            if (!action.args.id) {
              console.error('OfflineSyncManager: Invalid deliverOrder args:', action.args);
              continue;
            }
            result = await deliverOrder(action.args);
            break;
          default:
            console.warn('OfflineSyncManager: Unknown action type:', (action as PendingAction).type);
            continue;
        }

        // Si la mutación fue exitosa, eliminar de la cola
        if (result) {
          console.log(`OfflineSyncManager: Successfully processed action ${action.id} (${action.type})`);
          removePendingActionFn(action.id);
        } else {
          console.warn(`OfflineSyncManager: Action ${action.id} returned no result, keeping in queue`);
        }
      } catch (error) {
        // Ignorar errores de "Network request failed" o similares que indiquen desconexión momentánea
        // pero registrar otros errores
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('Network') && !errorMessage.includes('Offline')) {
          console.error(`OfflineSyncManager: Error processing action ${action.id} (${action.type}):`, error);
        }
        // Mantener en la cola para reintentar después
      }
    }

    isProcessingRef.current = false;
  }, [updateStock, transfer, setMinStock, createOrder, deliverOrder]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('OfflineSyncManager: Connection restored, processing queued actions...');
      // Pequeño delay para asegurar que la conexión está estable
      setTimeout(() => {
        processQueue();
      }, 1000);
    };

    // Escuchar evento online
    window.addEventListener('online', handleOnline);

    // Procesar cola si ya estamos online al montar
    if (typeof navigator !== 'undefined' && navigator.onLine && pendingActions.length > 0) {
      // Delay inicial para asegurar que todo está listo
      setTimeout(() => {
        processQueue();
      }, 500);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [processQueue, pendingActions.length]); // Incluir processQueue en dependencias

  // Procesar cola cuando cambian las acciones pendientes y estamos online
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    if (pendingActions.length === 0 || isProcessingRef.current) return;

    // Procesar después de un pequeño delay para evitar procesar múltiples veces
    const timeoutId = setTimeout(() => {
      processQueue();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [pendingActions.length, processQueue]);

  return null; // Componente invisible
}

/**
 * Hook helper to prefetch data when online
 * This keeps the local stores updated for offline usage
 */
function usePrefetchData(isOnline: boolean) {
  const setProducts = useInventoryStore((state) => state.setProducts);
  const setUsers = useUsersStore((state) => state.setUsers);

  // Always subscribe to queries, but we'll only update store if we get data
  // Convex query caching handles the "don't fetch if not needed" part efficiently
  const products = useQuery(api.products.listWithInventory);
  const users = useQuery(api.users.get);

  useEffect(() => {
    if (!isOnline) return;

    if (products) {
      setProducts(products as any);
    }

    if (users) {
      setUsers(users as any);
    }
  }, [products, users, isOnline, setProducts, setUsers]);
}
