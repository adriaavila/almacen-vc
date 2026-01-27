---
name: ""
overview: ""
todos: []
isProject: false
---

# Plan: Verificación Completa de Funcionalidades Offline

## Objetivo

Verificar que todas las funcionalidades offline funcionen correctamente y corregir problemas críticos identificados en el código.

## Problemas Críticos Identificados

### 1. Race Condition: useInventorySync sobrescribe actualizaciones optimistas

**Problema**: Cuando `useInventorySync` detecta datos de Convex, llama a `setProducts` que sobrescribe TODO el store, incluyendo actualizaciones optimistas offline.

**Escenario problemático**:

1. Usuario hace cambios offline → actualizaciones optimistas en store
2. Vuelve conexión → `useInventorySync` detecta datos de Convex
3. `setProducts` sobrescribe el store → se pierden actualizaciones optimistas temporalmente
4. `OfflineSyncManager` procesa cola → las mutaciones se ejecutan
5. Convex devuelve datos actualizados → se sincronizan correctamente

**Impacto**: Hay un momento donde la UI muestra datos antiguos aunque las actualizaciones optimistas estaban correctas.

**Ubicación**: `src/lib/hooks/useInventorySync.ts` línea 30

### 2. OfflineSyncManager - Dependencias de useCallback

**Problema**: `processQueue` tiene `pendingActions` en dependencias, pero `pendingActions` es un array que cambia de referencia constantemente, causando que el callback se recree en cada render.

**Impacto**: Puede causar renders innecesarios y problemas de performance.

**Ubicación**: `src/components/offline/OfflineSyncManager.tsx` línea 103

### 3. Falta de sincronización inmediata después de procesar cola

**Problema**: Después de procesar acciones pendientes exitosamente, el store no se actualiza inmediatamente. Depende de que `useInventorySync` detecte el cambio de Convex.

**Impacto**: Puede haber un delay entre cuando se procesa una acción y cuando la UI se actualiza.

## Correcciones a Implementar

### 1. Mejorar useInventorySync para no sobrescribir actualizaciones optimistas

Modificar `src/lib/hooks/useInventorySync.ts`:

```typescript
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
```

### 2. Corregir dependencias de useCallback en OfflineSyncManager

Modificar `src/components/offline/OfflineSyncManager.tsx`:

```typescript
const processQueue = useCallback(async () => {
  // Leer pendingActions dentro del callback usando getState
  const currentPendingActions = useInventoryStore.getState().pendingActions;
  const removePendingActionFn = useInventoryStore.getState().removePendingAction;
  
  if (isProcessingRef.current || currentPendingActions.length === 0) return;
  
  if (!navigator.onLine) {
    console.log('OfflineSyncManager: No connection, skipping queue processing');
    return;
  }
  
  isProcessingRef.current = true;
  const actionsToProcess = [...currentPendingActions].sort((a, b) => a.timestamp - b.timestamp);
  
  console.log(`OfflineSyncManager: Processing ${actionsToProcess.length} queued actions`);

  for (const action of actionsToProcess) {
    // ... código de procesamiento existente ...
    // Usar removePendingActionFn en lugar de removePendingAction
    if (result) {
      console.log(`OfflineSyncManager: Successfully processed action ${action.id} (${action.type})`);
      removePendingActionFn(action.id);
    }
  }

  isProcessingRef.current = false;
}, [updateStock, transfer, setMinStock, createOrder, deliverOrder]);
```

### 3. Verificar que useInventorySync se ejecute después de procesar cola

El `useInventorySync` ya debería detectar cambios automáticamente cuando Convex devuelve nuevos datos después de procesar las acciones. No se requiere cambio adicional, pero debemos verificar que funciona.

## Verificaciones a Realizar

### 1. Test de Flujo Completo Offline → Online

**Pasos**:

1. Abrir aplicación con conexión
2. Verificar que productos se cargan
3. Desconectar internet (Chrome DevTools → Network → Offline)
4. Hacer 2-3 actualizaciones de stock diferentes
5. Verificar que UI muestra valores actualizados inmediatamente
6. Verificar en localStorage que las acciones están en la cola
7. Reconectar internet
8. Verificar en consola que las acciones se procesan
9. Verificar que la UI muestra los valores finales correctos

### 2. Test de Persistencia entre Sesiones

**Pasos**:

1. Desconectar internet
2. Hacer actualizaciones offline
3. Cerrar completamente el navegador
4. Reabrir la aplicación (aún offline)
5. Verificar que las acciones persisten (localStorage)
6. Reconectar y verificar sincronización

### 3. Test de Race Condition

**Pasos**:

1. Desconectar internet
2. Actualizar stock de un producto (ej: almacen: 10 → 15)
3. Verificar que UI muestra 15
4. Reconectar internet rápidamente
5. Verificar que UI NO muestra 10 temporalmente (debe mantener 15)
6. Verificar que después de sincronizar muestra el valor correcto de Convex

### 4. Test de Múltiples Acciones

**Pasos**:

1. Desconectar internet
2. Hacer 5 actualizaciones de stock en orden
3. Verificar que todas están en la cola
4. Reconectar
5. Verificar que se procesan en orden cronológico
6. Verificar que todas se eliminan de la cola al completarse

## Archivos a Modificar

1. `src/lib/hooks/useInventorySync.ts` - Agregar verificación de pendingActions.length
2. `src/components/offline/OfflineSyncManager.tsx` - Usar getState() en useCallback

## Consideraciones

- **Prioridad Alta**: Corregir race condition es crítico para evitar pérdida temporal de datos
- **Prioridad Media**: Corregir dependencias de useCallback mejora performance pero no rompe funcionalidad
- **Testing**: Los problemas de race condition solo se detectan probando el flujo completo

## Resultado Esperado

Después de las correcciones:

- No se pierden actualizaciones optimistas cuando vuelve la conexión
- El useCallback no se recrea innecesariamente
- El flujo offline → online funciona perfectamente
- Las actualizaciones optimistas se mantienen hasta que se sincronizan
- La experiencia del usuario es fluida sin pérdida de datos

