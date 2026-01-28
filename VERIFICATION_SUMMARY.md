# Verificación: Movimientos con orderId

## Estado: ✅ Código Verificado y Corregido

### Verificaciones Completadas

1. **Schema (`convex/schema.ts`)**
   - ✅ Campo `orderId: v.optional(v.id("orders"))` existe en tabla `movements`
   - ✅ Índice `by_orderId` está creado

2. **Código de Creación de Movimientos (`convex/orders.ts`)**
   - ✅ Función `deliver` pasa `args.id` como `orderId` a `processProductDelivery` (línea 255)
   - ✅ Función `processProductDelivery` recibe `orderId` como parámetro
   - ✅ Insert de TRASLADO incluye `orderId` (línea 367)
   - ✅ Insert de CONSUMO incluye `orderId` (línea 382)
   - ✅ Validación agregada: se lanza error si `orderId` no está presente

3. **Queries (`convex/movements.ts`)**
   - ✅ Query `listGroupedByOrder` implementada correctamente
   - ✅ Maneja correctamente movimientos con y sin `orderId`
   - ✅ Agrupa movimientos por pedido
   - ✅ Retorna movimientos sin pedido en "Otros movimientos"

4. **Vista (`src/app/admin/movements/page.tsx`)**
   - ✅ Toggle para vista agrupada vs plana implementado
   - ✅ Componente `OrderGroup` muestra grupos de pedidos
   - ✅ Filtros funcionan en ambas vistas

### Cambios Realizados

1. **Validación Agregada** (`convex/orders.ts`, línea ~295)
   ```typescript
   // Validate that orderId is provided (required for movements from order delivery)
   if (!orderId) {
     throw new Error("orderId es requerido para crear movimientos desde entrega de pedidos");
   }
   ```

### Pruebas Manuales Requeridas

Para verificar que todo funciona correctamente:

1. **Crear un pedido de prueba**
   - Ir a `/requester/pedido`
   - Seleccionar productos y cantidades
   - Crear el pedido

2. **Entregar el pedido**
   - Ir a `/admin/pedidos`
   - Abrir el pedido creado
   - Hacer clic en "Marcar como entregado"

3. **Verificar movimientos**
   - Ir a `/admin/movements`
   - Activar toggle "Agrupar por pedidos"
   - Verificar que el pedido aparece agrupado con sus movimientos
   - Verificar que cada movimiento tiene la información correcta

4. **Verificar en base de datos (opcional)**
   - Los movimientos creados deben tener el campo `orderId` con el ID del pedido
   - Los movimientos deben ser de tipo `TRASLADO` (para Cafetín) o `CONSUMO` (para Cocina/Limpieza)

### Notas

- Los movimientos históricos (creados antes de esta implementación) no tendrán `orderId` y aparecerán en "Otros movimientos"
- Los movimientos creados manualmente (COMPRA, AJUSTE, etc.) no tienen `orderId` y es correcto
- Solo los movimientos creados al entregar pedidos deben tener `orderId`
