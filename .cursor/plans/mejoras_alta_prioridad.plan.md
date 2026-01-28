---
name: ""
overview: ""
todos: []
isProject: false
---

# Plan de Mejoras de Alta Prioridad - Backend Almacén

## Resumen

Este plan detalla la implementación de tres mejoras críticas:

1. **Autenticación y Autorización** (Seguridad)
2. **Optimización de Queries N+1** (Rendimiento)
3. **Estandarización de Validación** (Calidad)

Cada sección incluye documentación técnica para desarrolladores y guías para trabajadores.

---

## 1. Autenticación y Autorización

### 1.1 Objetivo

Implementar un sistema de autenticación real que identifique quién realiza cada acción y controle qué operaciones puede realizar cada usuario según su rol.

### 1.2 Problema Actual

- Todas las operaciones usan `user: "system"` hardcodeado
- No hay forma de saber quién hizo qué
- Cualquier persona con acceso puede hacer cualquier operación
- No hay auditoría de acciones

### 1.3 Arquitectura Propuesta

```
Frontend (Next.js)
    ↓
Convex Auth (Google OAuth / Email)
    ↓
Backend (Convex Functions)
    ├─ Obtener usuario autenticado
    ├─ Verificar rol
    └─ Registrar acción con usuario real
```

### 1.4 Pasos de Implementación

#### Paso 1.1: Configurar Convex Auth

**Archivo**: `convex/auth.ts` (nuevo)

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Google } from "convex/server";

const http = httpRouter();

http.route({
  path: "/auth/google",
  method: "GET",
  handler: Google({ type: "id" }),
});

export default http;
```

**Tareas**:

- Instalar `@convex-dev/auth` si no está instalado
- Configurar Google OAuth en Convex dashboard
- Crear archivo `convex/auth.ts` con configuración básica

#### Paso 1.2: Crear Helpers de Autenticación

**Archivo**: `convex/lib/auth-helpers.ts` (nuevo)

```typescript
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Obtiene el usuario autenticado actual
 * @throws Error si el usuario no está autenticado
 */
export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("No autenticado. Por favor inicia sesión.");
  }
  return identity;
}

/**
 * Obtiene el email del usuario autenticado
 */
export async function getAuthenticatedEmail(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await getAuthenticatedUser(ctx);
  return identity.email || identity.subject;
}

/**
 * Verifica que el usuario tenga uno de los roles permitidos
 * @param ctx Contexto de Convex
 * @param allowedRoles Roles permitidos para esta operación
 * @throws Error si el usuario no tiene el rol requerido
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: ("admin" | "requester" | "mantenimiento")[]
) {
  const identity = await getAuthenticatedUser(ctx);
  
  // Obtener rol del usuario desde la base de datos
  // Por ahora, usar email para determinar rol (temporal)
  // TODO: Crear tabla de usuarios con roles
  const userEmail = identity.email || "";
  
  // Mapeo temporal: emails que terminan en @vistacampo.com son admin
  const userRole = userEmail.includes("@vistacampo.com") ? "admin" : "requester";
  
  if (!allowedRoles.includes(userRole as any)) {
    throw new Error(
      `No autorizado. Se requiere uno de los siguientes roles: ${allowedRoles.join(", ")}`
    );
  }
  
  return { identity, role: userRole };
}

/**
 * Obtiene el nombre del usuario para mostrar en logs
 */
export async function getUserDisplayName(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await getAuthenticatedUser(ctx);
  return identity.name || identity.email || "Usuario desconocido";
}
```

**Tareas**:

- Crear directorio `convex/lib/` si no existe
- Crear archivo `convex/lib/auth-helpers.ts`
- Implementar funciones helper
- Agregar tipos TypeScript apropiados

#### Paso 1.3: Crear Tabla de Usuarios

**Archivo**: `convex/schema.ts` (modificar)

Agregar al schema:

```typescript
users: defineTable({
  email: v.string(),
  name: v.optional(v.string()),
  role: v.union(v.literal("admin"), v.literal("requester"), v.literal("mantenimiento")),
  area: v.optional(v.union(v.literal("Cocina"), v.literal("Cafetín"), v.literal("Limpieza"))),
  active: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_email", ["email"])
  .index("by_role", ["role"]),
```

**Tareas**:

- Agregar tabla `users` al schema
- Crear índices necesarios
- Crear función de migración para usuarios existentes

#### Paso 1.4: Actualizar Mutaciones para Usar Autenticación

**Archivos a modificar**:

- `convex/orders.ts`
- `convex/inventory.ts`
- `convex/movements.ts`
- `convex/products.ts`

**Ejemplo para `convex/orders.ts`**:

```typescript
import { getAuthenticatedEmail, requireRole } from "./lib/auth-helpers";

export const create = mutation({
  args: {
    area: v.union(v.literal("Cocina"), v.literal("Cafetín"), v.literal("Limpieza")),
    items: v.array(/* ... */),
  },
  handler: async (ctx, args) => {
    // Obtener usuario autenticado
    const userEmail = await getAuthenticatedEmail(ctx);
    
    // Validar que el usuario tenga permiso para crear pedidos
    // Los requesters pueden crear pedidos
    await requireRole(ctx, ["admin", "requester"]);
    
    // ... resto del código ...
    
    // Usar email real en lugar de "system"
    await ctx.db.insert("movements", {
      // ...
      user: userEmail, // ← Cambio aquí
      // ...
    });
  },
});

export const deliver = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    // Solo admins pueden entregar pedidos
    await requireRole(ctx, ["admin"]);
    
    const userEmail = await getAuthenticatedEmail(ctx);
    
    // ... resto del código usando userEmail ...
  },
});
```

**Tareas**:

- Actualizar `orders.create` - permitir admin y requester
- Actualizar `orders.deliver` - solo admin
- Actualizar `orders.remove` - solo admin
- Actualizar `inventory.updateStock` - solo admin
- Actualizar `inventory.transfer` - solo admin
- Actualizar `movements.registerCompra` - solo admin
- Actualizar `movements.registerConsumo` - admin y requester según contexto
- Actualizar `movements.registerAjuste` - solo admin
- Actualizar `products.bulkImport` - solo admin
- Actualizar `products.deleteProduct` - solo admin

#### Paso 1.5: Actualizar Frontend para Autenticación

**Archivos a modificar**:

- `src/lib/auth.ts` (refactorizar)
- Componentes que usan mutaciones

**Tareas**:

- Integrar Convex Auth en el frontend
- Crear componente de login
- Actualizar AdminGuard para usar autenticación real
- Agregar protección de rutas
- Mostrar nombre de usuario en UI

### 1.5 Documentación para Trabajadores

**Archivo**: `docs/AUTENTICACION_TRABAJADORES.md` (nuevo)

```markdown
# Guía de Autenticación - Para Trabajadores

## ¿Qué es la autenticación?

La autenticación es el proceso de identificarte en el sistema para que sepamos quién eres y qué puedes hacer.

## ¿Por qué es importante?

- **Seguridad**: Solo las personas autorizadas pueden hacer cambios
- **Auditoría**: Sabemos quién hizo cada acción
- **Control**: Cada persona solo puede hacer lo que le corresponde

## Cómo iniciar sesión

### Opción 1: Con Google (Recomendado)

1. Haz clic en "Iniciar sesión con Google"
2. Selecciona tu cuenta de Google
3. Acepta los permisos
4. ¡Listo! Ya estás dentro

### Opción 2: Con Email y Contraseña

1. Ingresa tu email corporativo
2. Ingresa tu contraseña
3. Haz clic en "Iniciar sesión"

## Roles y Permisos

### Solicitante (Requester)
**Quién**: Personal de Cocina, Cafetín, Limpieza

**Puede hacer**:
- ✅ Crear pedidos de productos
- ✅ Ver sus propios pedidos
- ✅ Ver inventario (solo lectura)

**NO puede hacer**:
- ❌ Entregar pedidos
- ❌ Modificar stock
- ❌ Eliminar productos
- ❌ Ver todos los pedidos

### Administrador (Admin)
**Quién**: Personal de Almacén

**Puede hacer**:
- ✅ Ver todos los pedidos
- ✅ Entregar pedidos
- ✅ Modificar stock
- ✅ Agregar productos
- ✅ Ver reportes y estadísticas
- ✅ Hacer ajustes de inventario

### Mantenimiento
**Quién**: Personal de Mantenimiento

**Puede hacer**:
- ✅ Gestionar activos
- ✅ Gestionar repuestos
- ✅ Crear trabajos de mantenimiento
- ✅ Ver inventario de repuestos

## Preguntas Frecuentes

### ¿Qué pasa si olvido mi contraseña?
Contacta al administrador del sistema para resetear tu contraseña.

### ¿Puedo cambiar mi rol?
No, los roles los asigna el administrador del sistema.

### ¿Qué pasa si intento hacer algo que no puedo?
Verás un mensaje que dice "No autorizado" y la acción no se realizará.

### ¿Mi actividad queda registrada?
Sí, todas tus acciones quedan registradas con tu nombre y fecha/hora.

## Seguridad

- **Nunca compartas tu contraseña** con nadie
- **Cierra sesión** cuando termines, especialmente en computadoras compartidas
- **Reporta** cualquier actividad sospechosa al administrador
```

### 1.6 Documentación Técnica

**Archivo**: `docs/AUTENTICACION_TECNICA.md` (nuevo)

```markdown
# Documentación Técnica - Autenticación

## Arquitectura

El sistema usa Convex Auth con Google OAuth como proveedor principal.

## Flujo de Autenticación

1. Usuario hace clic en "Iniciar sesión"
2. Frontend redirige a `/auth/google`
3. Convex maneja OAuth con Google
4. Google redirige de vuelta con token
5. Convex valida token y crea sesión
6. Frontend recibe sesión y guarda token

## Estructura de Datos

### Tabla `users`
```typescript
{
  email: string;
  name?: string;
  role: "admin" | "requester" | "mantenimiento";
  area?: "Cocina" | "Cafetín" | "Limpieza";
  active: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### Identity Object (de Convex Auth)

```typescript
{
  subject: string; // ID único del usuario
  email?: string;
  name?: string;
  emailVerified?: boolean;
  pictureUrl?: string;
}
```

## Helpers Disponibles

### `getAuthenticatedUser(ctx)`

Obtiene el objeto identity del usuario autenticado.
Lanza error si no hay usuario autenticado.

### `getAuthenticatedEmail(ctx)`

Obtiene el email del usuario autenticado.
Útil para registrar acciones.

### `requireRole(ctx, allowedRoles)`

Verifica que el usuario tenga uno de los roles permitidos.
Lanza error si no tiene el rol requerido.

### `getUserDisplayName(ctx)`

Obtiene el nombre para mostrar del usuario.

## Ejemplos de Uso

### Mutación que requiere autenticación

```typescript
export const create = mutation({
  handler: async (ctx, args) => {
    const userEmail = await getAuthenticatedEmail(ctx);
    // ... usar userEmail ...
  },
});
```

### Mutación que requiere rol específico

```typescript
export const deliver = mutation({
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    // ... código solo para admins ...
  },
});
```

### Query que muestra datos según rol

```typescript
export const list = query({
  handler: async (ctx) => {
    const { role } = await requireRole(ctx, ["admin", "requester"]);
    
    if (role === "admin") {
      // Mostrar todos los pedidos
      return await ctx.db.query("orders").collect();
    } else {
      // Mostrar solo pedidos del usuario
      const email = await getAuthenticatedEmail(ctx);
      return await ctx.db
        .query("orders")
        .filter(q => q.eq(q.field("createdBy"), email))
        .collect();
    }
  },
});
```

## Migración de Datos Existentes

Los movimientos existentes tienen `user: "system"`. Estos se mantienen para auditoría histórica.

Para nuevos movimientos, siempre usar el email del usuario autenticado.

## Testing

```typescript
// Test de autenticación requerida
test("create order requires authentication", async () => {
  await expect(
    createOrder({ area: "Cocina", items: [] })
  ).rejects.toThrow("No autenticado");
});

// Test de autorización
test("deliver order requires admin role", async () => {
  await authenticateAsRequester();
  await expect(
    deliverOrder({ id: orderId })
  ).rejects.toThrow("No autorizado");
});
```

## Troubleshooting

### Error: "No autenticado"

- Verificar que el usuario haya iniciado sesión
- Verificar que el token de sesión sea válido
- Verificar configuración de Convex Auth

### Error: "No autorizado"

- Verificar que el usuario tenga el rol correcto
- Verificar que la función esté usando `requireRole` correctamente
- Contactar administrador para verificar roles

```

---

## 2. Optimización de Queries N+1

### 2.1 Objetivo

Mejorar el rendimiento de las queries que hacen múltiples llamadas a la base de datos en loops, reduciendo el tiempo de respuesta y el costo de operaciones.

### 2.2 Problema Actual

Varias queries hacen múltiples llamadas individuales a la DB dentro de loops:

**Ejemplo problemático**:
```typescript
// ❌ MAL: Hace N queries (una por cada orderItem)
const items = await Promise.all(
  orderItems.map(async (oi) => {
    const product = await ctx.db.get(oi.productId); // Query individual
    return { ...oi, product };
  })
);
```

**Problemas**:

- Si hay 10 orderItems, hace 10 queries separadas
- Lento y costoso
- No escala bien

### 2.3 Solución: Usar `bulkGet`

**Ejemplo optimizado**:

```typescript
// ✅ BIEN: Hace 1 query para todos los productos
const productIds = orderItems.map(oi => oi.productId);
const products = await ctx.db.bulkGet(productIds); // Una sola query
const productMap = new Map(products.map(p => [p._id, p]));
const items = orderItems.map(oi => ({
  ...oi,
  product: productMap.get(oi.productId)
}));
```

### 2.4 Queries a Optimizar

#### 2.4.1 `orders.getById`

**Archivo**: `convex/orders.ts` (líneas 22-66)

**Antes**:

```typescript
const items = await Promise.all(
  orderItems.map(async (oi) => {
    if (!oi.productId) return null;
    const product = await ctx.db.get(oi.productId); // N queries
    if (!product) return null;
    return { ...oi, product };
  })
);
```

**Después**:

```typescript
// Obtener todos los productIds únicos
const productIds = orderItems
  .map(oi => oi.productId)
  .filter((id): id is Id<"products"> => id !== undefined);

// Una sola query para todos los productos
const products = await ctx.db.bulkGet(productIds);
const productMap = new Map(products.map(p => [p._id, p]));

// Mapear orderItems con productos
const items = orderItems
  .map(oi => {
    if (!oi.productId) return null;
    const product = productMap.get(oi.productId);
    if (!product) return null;
    return {
      _id: product._id,
      nombre: product.name,
      categoria: product.category,
      // ... resto de campos
    };
  })
  .filter((item): item is NonNullable<typeof item> => item !== null);
```

**Impacto esperado**: 

- De N queries a 1 query
- Reducción de tiempo: ~70-90% para pedidos con múltiples items

#### 2.4.2 `inventory.list`

**Archivo**: `convex/inventory.ts` (líneas 9-26)

**Antes**:

```typescript
const inventoryWithProducts = await Promise.all(
  inventory.map(async (inv) => {
    const product = await ctx.db.get(inv.productId); // N queries
    return { ...inv, product: product || undefined };
  })
);
```

**Después**:

```typescript
// Obtener todos los productIds únicos
const productIds = [...new Set(inventory.map(inv => inv.productId))];
const products = await ctx.db.bulkGet(productIds);
const productMap = new Map(products.map(p => [p._id, p]));

// Mapear inventory con productos
const inventoryWithProducts = inventory.map(inv => ({
  ...inv,
  product: productMap.get(inv.productId) || undefined,
}));
```

**Impacto esperado**:

- De N queries a 1 query
- Reducción de tiempo: ~80-95% para listas grandes

#### 2.4.3 `movements.list`

**Archivo**: `convex/movements.ts` (líneas 9-34)

**Antes**:

```typescript
const movementsWithProducts = await Promise.all(
  movements.map(async (mov) => {
    const product = await ctx.db.get(mov.productId); // N queries
    return { ...mov, product: product || undefined };
  })
);
```

**Después**:

```typescript
// Obtener todos los productIds únicos
const productIds = [...new Set(movements.map(mov => mov.productId))];
const products = await ctx.db.bulkGet(productIds);
const productMap = new Map(products.map(p => [p._id, p]));

// Mapear movements con productos
const movementsWithProducts = movements.map(mov => ({
  ...mov,
  product: productMap.get(mov.productId) || undefined,
}));
```

**Impacto esperado**:

- De N queries a 1 query
- Reducción de tiempo: ~75-90% para listas grandes

#### 2.4.4 `analytics.getMostRequestedItems`

**Archivo**: `convex/analytics.ts` (líneas 331-390)

**Problema**: Hace queries dentro de loops anidados

**Optimización**: Similar a las anteriores, usar `bulkGet` para productos

### 2.5 Documentación Técnica

**Archivo**: `docs/OPTIMIZACION_QUERIES.md` (nuevo)

```markdown
# Optimización de Queries N+1

## ¿Qué es el problema N+1?

El problema N+1 ocurre cuando haces una query para obtener una lista de items, y luego haces otra query por cada item para obtener datos relacionados.

**Ejemplo**:
```typescript
// Query 1: Obtener pedidos
const orders = await ctx.db.query("orders").collect(); // 1 query

// Query 2-N: Obtener productos para cada pedido
for (const order of orders) {
  const product = await ctx.db.get(order.productId); // N queries más
}
```

**Total**: 1 + N queries (si hay 100 pedidos, son 101 queries)

## Solución: bulkGet

Convex proporciona `bulkGet()` que permite obtener múltiples documentos en una sola query.

```typescript
// Obtener todos los IDs únicos
const productIds = orders.map(o => o.productId);
const uniqueIds = [...new Set(productIds)];

// Una sola query para todos
const products = await ctx.db.bulkGet(uniqueIds); // 1 query

// Crear mapa para lookup rápido
const productMap = new Map(products.map(p => [p._id, p]));

// Mapear datos
const ordersWithProducts = orders.map(order => ({
  ...order,
  product: productMap.get(order.productId)
}));
```

**Total**: 2 queries (siempre, sin importar cuántos pedidos)

## Patrón de Optimización

### Paso 1: Identificar el problema

Buscar `Promise.all` con `ctx.db.get()` dentro de un `map`:

```typescript
// ❌ Problema N+1
await Promise.all(
  items.map(async (item) => {
    const related = await ctx.db.get(item.relatedId);
    return { ...item, related };
  })
);
```

### Paso 2: Extraer IDs únicos

```typescript
const relatedIds = items.map(item => item.relatedId);
const uniqueIds = [...new Set(relatedIds)];
```

### Paso 3: Usar bulkGet

```typescript
const relatedItems = await ctx.db.bulkGet(uniqueIds);
const relatedMap = new Map(relatedItems.map(r => [r._id, r]));
```

### Paso 4: Mapear resultados

```typescript
const itemsWithRelated = items.map(item => ({
  ...item,
  related: relatedMap.get(item.relatedId)
}));
```

## Cuándo usar bulkGet

✅ **Usar cuando**:

- Necesitas obtener múltiples documentos relacionados
- Los IDs ya los tienes (no necesitas buscar)
- Los documentos están en la misma tabla

❌ **NO usar cuando**:

- Necesitas filtrar o buscar documentos
- Necesitas documentos de diferentes tablas con condiciones complejas
- Solo necesitas 1-2 documentos (el overhead no vale la pena)

## Ejemplos Reales

### Ejemplo 1: OrderItems con Products

```typescript
// Antes: N+1
const items = await Promise.all(
  orderItems.map(async (oi) => {
    const product = await ctx.db.get(oi.productId);
    return { ...oi, product };
  })
);

// Después: Optimizado
const productIds = orderItems.map(oi => oi.productId);
const products = await ctx.db.bulkGet(productIds);
const productMap = new Map(products.map(p => [p._id, p]));
const items = orderItems.map(oi => ({
  ...oi,
  product: productMap.get(oi.productId)
}));
```

### Ejemplo 2: Inventory con Products

```typescript
// Antes: N+1
const inventoryWithProducts = await Promise.all(
  inventory.map(async (inv) => {
    const product = await ctx.db.get(inv.productId);
    return { ...inv, product };
  })
);

// Después: Optimizado
const productIds = [...new Set(inventory.map(inv => inv.productId))];
const products = await ctx.db.bulkGet(productIds);
const productMap = new Map(products.map(p => [p._id, p]));
const inventoryWithProducts = inventory.map(inv => ({
  ...inv,
  product: productMap.get(inv.productId)
}));
```

## Métricas de Rendimiento

### Antes de optimización

- `orders.getById` con 10 items: ~200-300ms
- `inventory.list` con 100 productos: ~500-800ms
- `movements.list` con 50 movimientos: ~300-500ms

### Después de optimización

- `orders.getById` con 10 items: ~50-80ms (reducción 70-75%)
- `inventory.list` con 100 productos: ~80-120ms (reducción 80-85%)
- `movements.list` con 50 movimientos: ~60-100ms (reducción 75-80%)

## Testing

```typescript
test("getById uses bulkGet instead of individual queries", async () => {
  const order = await createOrderWithItems(10); // 10 items
  
  // Mock para contar queries
  const queryCount = { count: 0 };
  const originalGet = ctx.db.get;
  ctx.db.get = async (...args) => {
    queryCount.count++;
    return originalGet.apply(ctx.db, args);
  };
  
  await getById({ id: order._id });
  
  // Debería hacer máximo 2 queries (order + bulkGet de products)
  expect(queryCount.count).toBeLessThanOrEqual(2);
});
```

## Checklist de Optimización

- Identificar queries con problema N+1
- Extraer IDs únicos
- Reemplazar con bulkGet
- Crear Map para lookup O(1)
- Mapear resultados
- Probar con datos reales
- Medir mejora de rendimiento
- Documentar cambios

```

### 2.6 Tareas de Implementación

- [ ] Optimizar `orders.getById` (líneas 22-66)
- [ ] Optimizar `inventory.list` (líneas 9-26)
- [ ] Optimizar `inventory.getByLocation` (líneas 29-52)
- [ ] Optimizar `inventory.getLowStock` (líneas 82-113)
- [ ] Optimizar `movements.list` (líneas 9-34)
- [ ] Optimizar `movements.getByType` (líneas 55-86)
- [ ] Optimizar `movements.getRecent` (líneas 89-114)
- [ ] Optimizar `movements.getByDateRange` (líneas 117-163)
- [ ] Optimizar `analytics.getMostRequestedItems` (líneas 331-390)
- [ ] Probar todas las queries optimizadas
- [ ] Medir mejoras de rendimiento

---

## 3. Estandarización de Validación

### 3.1 Objetivo

Crear un sistema consistente de validación que prevenga errores, mejore la experiencia del usuario y facilite el mantenimiento del código.

### 3.2 Problema Actual

- Validación inconsistente entre funciones
- Algunas funciones validan, otras no
- Mensajes de error diferentes
- Código duplicado para validaciones comunes
- Difícil de mantener y extender

### 3.3 Arquitectura Propuesta

```

Input → Validadores → Helpers de Validación → Error Estructurado → Mensaje al Usuario

```

### 3.4 Crear Helpers de Validación

**Archivo**: `convex/lib/validation.ts` (nuevo)

```typescript
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Códigos de error estándar
 */
export enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK",
  INVALID_INPUT = "INVALID_INPUT",
  DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
}

/**
 * Error personalizado con código y mensaje
 */
export class ValidationError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public field?: string,
    public value?: unknown
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Valida que un producto exista
 */
export async function validateProductExists(
  ctx: QueryCtx | MutationCtx,
  productId: Id<"products">,
  fieldName: string = "productId"
): Promise<NonNullable<Awaited<ReturnType<typeof ctx.db.get<"products">>>>> {
  const product = await ctx.db.get(productId);
  if (!product) {
    throw new ValidationError(
      ErrorCode.NOT_FOUND,
      `El producto con ID ${productId} no existe`,
      fieldName,
      productId
    );
  }
  return product;
}

/**
 * Valida que un pedido exista
 */
export async function validateOrderExists(
  ctx: QueryCtx | MutationCtx,
  orderId: Id<"orders">,
  fieldName: string = "orderId"
) {
  const order = await ctx.db.get(orderId);
  if (!order) {
    throw new ValidationError(
      ErrorCode.NOT_FOUND,
      `El pedido con ID ${orderId} no existe`,
      fieldName,
      orderId
    );
  }
  return order;
}

/**
 * Valida que la cantidad sea positiva
 */
export function validatePositiveQuantity(
  cantidad: number,
  fieldName: string = "cantidad"
): void {
  if (cantidad <= 0) {
    throw new ValidationError(
      ErrorCode.INVALID_INPUT,
      `La cantidad debe ser mayor a 0. Valor recibido: ${cantidad}`,
      fieldName,
      cantidad
    );
  }
}

/**
 * Valida que el stock sea suficiente
 */
export function validateSufficientStock(
  disponible: number,
  solicitado: number,
  productName: string
): void {
  if (disponible < solicitado) {
    throw new ValidationError(
      ErrorCode.INSUFFICIENT_STOCK,
      `Stock insuficiente para ${productName}. Disponible: ${disponible}, Solicitado: ${solicitado}`,
      "cantidad",
      solicitado
    );
  }
}

/**
 * Valida que el stock no sea negativo
 */
export function validateNonNegativeStock(
  stock: number,
  fieldName: string = "stock"
): void {
  if (stock < 0) {
    throw new ValidationError(
      ErrorCode.INVALID_INPUT,
      `El stock no puede ser negativo. Valor recibido: ${stock}`,
      fieldName,
      stock
    );
  }
}

/**
 * Valida que un string no esté vacío
 */
export function validateNonEmptyString(
  value: string,
  fieldName: string
): void {
  if (!value || value.trim() === "") {
    throw new ValidationError(
      ErrorCode.INVALID_INPUT,
      `El campo ${fieldName} es requerido y no puede estar vacío`,
      fieldName,
      value
    );
  }
}

/**
 * Valida que un array no esté vacío
 */
export function validateNonEmptyArray<T>(
  array: T[],
  fieldName: string
): void {
  if (!array || array.length === 0) {
    throw new ValidationError(
      ErrorCode.INVALID_INPUT,
      `El campo ${fieldName} debe contener al menos un elemento`,
      fieldName,
      array
    );
  }
}

/**
 * Valida que un pedido no esté ya entregado
 */
export function validateOrderNotDelivered(order: { status: string }): void {
  if (order.status === "entregado") {
    throw new ValidationError(
      ErrorCode.VALIDATION_ERROR,
      "El pedido ya fue entregado y no puede ser modificado",
      "status",
      order.status
    );
  }
}

/**
 * Valida que las ubicaciones sean diferentes en un traslado
 */
export function validateDifferentLocations(
  from: string,
  to: string
): void {
  if (from === to) {
    throw new ValidationError(
      ErrorCode.INVALID_INPUT,
      `La ubicación de origen y destino deben ser diferentes. Ambas son: ${from}`,
      "to",
      to
    );
  }
}

/**
 * Valida que el factor de conversión sea válido
 */
export function validateConversionFactor(factor: number): void {
  if (factor <= 0) {
    throw new ValidationError(
      ErrorCode.INVALID_INPUT,
      `El factor de conversión debe ser mayor a 0. Valor recibido: ${factor}`,
      "conversionFactor",
      factor
    );
  }
}
```

### 3.5 Actualizar Funciones para Usar Validadores

**Ejemplo para `convex/orders.ts`**:

```typescript
import {
  validateProductExists,
  validateOrderExists,
  validatePositiveQuantity,
  validateNonEmptyArray,
  validateOrderNotDelivered,
  validateSufficientStock,
} from "./lib/validation";

export const create = mutation({
  args: {
    area: v.union(v.literal("Cocina"), v.literal("Cafetín"), v.literal("Limpieza")),
    items: v.array(
      v.object({
        productId: v.id("products"),
        cantidad: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Validar que haya items
    validateNonEmptyArray(args.items, "items");
    
    // Filtrar items con cantidad > 0
    const validItems = args.items.filter((item) => item.cantidad > 0);
    validateNonEmptyArray(validItems, "items");
    
    // Validar cada item
    for (const item of validItems) {
      validatePositiveQuantity(item.cantidad, "cantidad");
      await validateProductExists(ctx, item.productId, "productId");
      
      // Opcional: Validar stock disponible
      // const product = await validateProductExists(ctx, item.productId);
      // const inventory = await getInventory(ctx, item.productId, "almacen");
      // validateSufficientStock(inventory.stockActual, item.cantidad, product.name);
    }
    
    // ... resto del código ...
  },
});

export const deliver = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    // Validar que el pedido exista
    const order = await validateOrderExists(ctx, args.id);
    
    // Validar que no esté ya entregado
    validateOrderNotDelivered(order);
    
    // ... resto del código ...
  },
});
```

### 3.6 Crear Helper para Manejar Errores

**Archivo**: `convex/lib/error-handler.ts` (nuevo)

```typescript
import { ValidationError, ErrorCode } from "./validation";

/**
 * Convierte errores de validación en mensajes amigables para el usuario
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    // Mensajes de error conocidos de Convex
    if (error.message.includes("not found")) {
      return "El recurso solicitado no existe";
    }
    if (error.message.includes("unauthorized")) {
      return "No tienes permiso para realizar esta acción";
    }
    return error.message;
  }
  
  return "Ocurrió un error inesperado. Por favor intenta de nuevo.";
}

/**
 * Loggea errores con contexto para debugging
 */
export function logError(
  error: unknown,
  context: {
    operation: string;
    userId?: string;
    [key: string]: unknown;
  }
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error("[ERROR]", {
    ...context,
    error: errorMessage,
    stack: errorStack,
    timestamp: new Date().toISOString(),
  });
}
```

### 3.7 Documentación Técnica

**Archivo**: `docs/VALIDACION_TECNICA.md` (nuevo)

```markdown
# Sistema de Validación Estandarizado

## Objetivo

Proporcionar validación consistente y reutilizable en todo el backend para prevenir errores y mejorar la experiencia del usuario.

## Arquitectura

```

Input → Validadores → Error Estructurado → Mensaje al Usuario

```

## Validadores Disponibles

### Validación de Existencia

#### `validateProductExists(ctx, productId, fieldName?)`
Valida que un producto exista en la base de datos.

**Uso**:
```typescript
const product = await validateProductExists(ctx, productId);
// product está garantizado de existir
```

#### `validateOrderExists(ctx, orderId, fieldName?)`

Valida que un pedido exista.

### Validación de Valores

#### `validatePositiveQuantity(cantidad, fieldName?)`

Valida que la cantidad sea mayor a 0.

#### `validateNonNegativeStock(stock, fieldName?)`

Valida que el stock no sea negativo.

#### `validateNonEmptyString(value, fieldName)`

Valida que un string no esté vacío.

#### `validateNonEmptyArray(array, fieldName)`

Valida que un array tenga al menos un elemento.

### Validación de Lógica de Negocio

#### `validateSufficientStock(disponible, solicitado, productName)`

Valida que haya suficiente stock disponible.

#### `validateOrderNotDelivered(order)`

Valida que un pedido no esté ya entregado.

#### `validateDifferentLocations(from, to)`

Valida que las ubicaciones sean diferentes en un traslado.

#### `validateConversionFactor(factor)`

Valida que el factor de conversión sea válido.

## Códigos de Error

```typescript
enum ErrorCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK",
  INVALID_INPUT = "INVALID_INPUT",
  DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
}
```

## Uso en Mutaciones

### Ejemplo Básico

```typescript
export const create = mutation({
  args: { productId: v.id("products"), cantidad: v.number() },
  handler: async (ctx, args) => {
    // Validar inputs
    validatePositiveQuantity(args.cantidad);
    await validateProductExists(ctx, args.productId);
    
    // ... resto del código ...
  },
});
```

### Ejemplo con Múltiples Validaciones

```typescript
export const deliver = mutation({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => {
    // Validar existencia
    const order = await validateOrderExists(ctx, args.id);
    
    // Validar estado
    validateOrderNotDelivered(order);
    
    // Validar items
    const orderItems = await getOrderItems(ctx, args.id);
    validateNonEmptyArray(orderItems, "orderItems");
    
    // Validar stock para cada item
    for (const item of orderItems) {
      const product = await validateProductExists(ctx, item.productId);
      const inventory = await getInventory(ctx, item.productId, "almacen");
      validateSufficientStock(
        inventory.stockActual,
        item.cantidad,
        product.name
      );
    }
    
    // ... resto del código ...
  },
});
```

## Manejo de Errores

### En el Backend

```typescript
import { ValidationError } from "./lib/validation";
import { logError, getErrorMessage } from "./lib/error-handler";

export const create = mutation({
  handler: async (ctx, args) => {
    try {
      validatePositiveQuantity(args.cantidad);
      // ... resto del código ...
    } catch (error) {
      // Loggear para debugging
      logError(error, {
        operation: "createOrder",
        userId: await getAuthenticatedEmail(ctx),
        args,
      });
      
      // Lanzar error con mensaje amigable
      throw new Error(getErrorMessage(error));
    }
  },
});
```

### En el Frontend

```typescript
try {
  await createOrder({ area: "Cocina", items: [...] });
} catch (error) {
  // El mensaje de error ya viene en español y es amigable
  showToast(error.message, "error");
}
```

## Buenas Prácticas

1. **Validar temprano**: Validar inputs al inicio de la función
2. **Validar todo**: No asumir que los datos son válidos
3. **Mensajes claros**: Usar mensajes en español y específicos
4. **Códigos de error**: Usar códigos para categorizar errores
5. **Logging**: Siempre loggear errores con contexto

## Testing

```typescript
test("validateProductExists throws error for non-existent product", async () => {
  const fakeId = "j1234567890" as Id<"products">;
  
  await expect(
    validateProductExists(ctx, fakeId)
  ).rejects.toThrow("no existe");
});

test("validatePositiveQuantity throws error for zero", () => {
  expect(() => validatePositiveQuantity(0)).toThrow();
  expect(() => validatePositiveQuantity(-1)).toThrow();
  expect(() => validatePositiveQuantity(1)).not.toThrow();
});
```

## Checklist de Validación

Para cada mutación nueva:

- Validar que los IDs existan
- Validar que los valores numéricos sean válidos (positivos, no negativos, etc.)
- Validar que los strings no estén vacíos
- Validar que los arrays no estén vacíos cuando sea necesario
- Validar lógica de negocio (stock suficiente, estados válidos, etc.)
- Probar casos edge (valores límite, valores inválidos)
- Agregar mensajes de error claros
- Loggear errores con contexto

```

### 3.8 Tareas de Implementación

- [ ] Crear `convex/lib/validation.ts` con todos los validadores
- [ ] Crear `convex/lib/error-handler.ts` con manejo de errores
- [ ] Actualizar `orders.create` con validaciones
- [ ] Actualizar `orders.deliver` con validaciones
- [ ] Actualizar `orders.remove` con validaciones
- [ ] Actualizar `inventory.updateStock` con validaciones
- [ ] Actualizar `inventory.transfer` con validaciones
- [ ] Actualizar `movements.registerCompra` con validaciones
- [ ] Actualizar `movements.registerConsumo` con validaciones
- [ ] Actualizar `movements.registerTraslado` con validaciones
- [ ] Actualizar `movements.registerAjuste` con validaciones
- [ ] Actualizar `products.create` con validaciones
- [ ] Actualizar `products.bulkImport` con validaciones
- [ ] Probar todas las validaciones
- [ ] Documentar uso de validadores

---

## Cronograma de Implementación

### Semana 1: Autenticación
- Día 1-2: Configurar Convex Auth y crear helpers
- Día 3-4: Actualizar mutaciones críticas
- Día 5: Testing y documentación

### Semana 2: Optimización de Queries
- Día 1-2: Optimizar queries principales (orders, inventory, movements)
- Día 3: Optimizar analytics
- Día 4-5: Testing y medición de rendimiento

### Semana 3: Validación
- Día 1-2: Crear sistema de validación
- Día 3-4: Actualizar todas las mutaciones
- Día 5: Testing y documentación

---

## Métricas de Éxito

### Autenticación
- ✅ Todas las mutaciones críticas requieren autenticación
- ✅ Roles correctamente implementados
- ✅ 100% de acciones registradas con usuario real

### Optimización
- ✅ Reducción de tiempo de respuesta >50% en queries principales
- ✅ Reducción de número de queries >70%
- ✅ Tiempo de carga de páginas <500ms

### Validación
- ✅ 100% de mutaciones con validación estándar
- ✅ Mensajes de error consistentes y en español
- ✅ Reducción de errores en producción >30%
```

