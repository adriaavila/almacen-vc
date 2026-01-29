---
name: FAB crear/eliminar producto
overview: En admin/inventario y requester/stock, mostrar el botón "Crear producto" solo al pulsar Editar (modo edición), y añadir el botón "Eliminar producto" dentro del modal que se abre al pulsar un producto para editar.
todos: []
isProject: false
---

# Plan: Crear producto (en modo edición) y eliminar en modal (inventario/stock)

## Contexto

- **admin/inventario** ([src/app/admin/inventario/page.tsx](src/app/admin/inventario/page.tsx)): lista de productos; botón "Editar" activa `editMode`; al hacer clic en un producto en modo edición se abre `EditProductModal`. No hay flujo de crear producto ni botón eliminar en el modal.
- **requester/stock** ([src/app/requester/stock/page.tsx](src/app/requester/stock/page.tsx)): misma estructura, `EditProductModal` con `location="cafetin"`.

**EditProductModal** ([src/components/ui/EditProductModal.tsx](src/components/ui/EditProductModal.tsx)): exige `productId` (query `getWithInventory`), solo modo edición. Botones: Cancelar y Guardar Cambios; no hay eliminar.

**Backend**: [convex/products.ts](convex/products.ts) expone `create` y `deleteProduct`; [convex/inventory.ts](convex/inventory.ts) tiene `initialize` para crear inventario por producto/ubicación.

---

## Alcance

1. **admin/inventario** y **requester/stock**: Mostrar botón **"Crear producto"** solo cuando el usuario ha pulsado **Editar** (es decir, cuando `editMode === true`). Al pulsarlo, abrir el modal en modo creación. **Eliminar producto**: botón dentro del modal al editar un producto existente, con confirmación.
2. **EditProductModal**: soportar modo creación (`productId === null`) y añadir botón "Eliminar producto" en modo edición con confirmación.

---

## 1. EditProductModal: modo crear y eliminar

**Archivo:** [src/components/ui/EditProductModal.tsx](src/components/ui/EditProductModal.tsx)

- **Props**: Hacer `productId` opcional (`Id<'products'> | null`). Añadir `onProductDeleted?: () => void` opcional. Mantener `location` (para crear: definir si el modal crea solo almacén, solo cafetin, o ambos según quien lo abra; por defecto almacén).
- **Modo crear** (`productId === null`):
  - No ejecutar `getWithInventory` (usar `'skip'`).
  - Formulario vacío con valores por defecto (nombre, categoría, unidades, etc.).
  - Al enviar: llamar `api.products.create` con los campos del formulario; luego `api.inventory.initialize` para la ubicación correspondiente (por ejemplo `location` del prop, o solo `almacen` en admin y `cafetin`/almacén según criterio acordado). Tras éxito: `onClose()` y `onProductUpdated?.()`.
- **Modo edición** (`productId !== null`):
  - Comportamiento actual. Añadir en el footer del modal (junto a Cancelar / Guardar):
    - Botón “Eliminar producto” (variant destructivo, a la izquierda o debajo según diseño).
    - Al hacer clic: mostrar confirmación (usar [ConfirmationModal](src/components/ui/ConfirmationModal.tsx) o estado local con mensaje tipo “¿Eliminar producto X? Se eliminará el producto y su inventario. No se puede deshacer.”).
    - Al confirmar: `api.products.deleteProduct({ id: productId })`, luego `onClose()`, `onProductDeleted?.()` y `onProductUpdated?.()`.
- **Queries/mutations**: En el componente, usar `useMutation(api.products.deleteProduct)` para eliminar. Para crear, `useMutation(api.products.create)` y `useMutation(api.inventory.initialize)` (o exponer un único mutation en backend que cree producto + inventario si se prefiere).

---

## 2. admin/inventario: botón “Crear producto” en modo edición y modal crear/eliminar

**Archivo:** [src/app/admin/inventario/page.tsx](src/app/admin/inventario/page.tsx)

- **Botón “Crear producto”**: Mostrarlo solo cuando `editMode === true` (junto al botón “Editar” / “Modo Edición”, en la misma barra de filtros/acciones). Al hacer clic: abrir el modal en modo crear (no abrir un producto concreto).
- Estado para “modal en modo crear”: p. ej. `isCreateProductOpen: boolean`. Al pulsar “Crear producto”, `setIsCreateProductOpen(true)`. El modal se abre con `isOpen={isCreateProductOpen || editingProductId !== null}` y `productId={isCreateProductOpen ? null : editingProductId}`. Al cerrar el modal, resetear: `setIsCreateProductOpen(false)` y `setEditingProductId(null)`.
- **EditProductModal**: Pasar `onProductDeleted` para mostrar toast y cerrar modal tras eliminar. No hay FAB; el botón “Crear producto” es un botón normal en la barra de acciones, visible solo en modo edición.

---

## 3. requester/stock: mismo patrón

**Archivo:** [src/app/requester/stock/page.tsx](src/app/requester/stock/page.tsx)

- Igual que admin/inventario: cuando `editMode === true`, mostrar botón “Crear producto” en la barra de acciones (junto a “Editar” / “Modo Edición”). Estado `isCreateProductOpen`, abrir modal con `productId={null}` para crear. `EditProductModal` con `location="cafetin"` y `onProductDeleted`. Al crear, inicializar inventario según ubicación (p. ej. cafetin).

---

## 4. Flujo de datos y permisos

- Crear producto: ya existe `api.products.create`; no hay auth en MVP, así que tanto admin como requester pueden crear cuando estén en modo edición.
- Eliminar: `api.products.deleteProduct` existe; sin auth ambos pueden llamarlo. Si más adelante se restringe por rol, el modal puede recibir un prop `allowDelete?: boolean` y ocultar el botón para requester.
- Inventario inicial al crear: en admin/inventario típicamente `almacen`; en requester/stock podría ser `cafetin` o ambos (p. ej. admin crea con inventario almacén; requester crea con inventario cafetin).

---

## 5. Resumen de archivos a tocar


| Archivo                                                                          | Cambios                                                                                                                                         |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [src/components/ui/EditProductModal.tsx](src/components/ui/EditProductModal.tsx) | `productId` opcional; modo crear (form vacío + create + initialize); botón Eliminar + confirmación; `onProductDeleted`.                         |
| [src/app/admin/inventario/page.tsx](src/app/admin/inventario/page.tsx)           | Botón “Crear producto” visible solo si `editMode === true`; estado `isCreateProductOpen`; pasar `productId=null` y `onProductDeleted` al modal. |
| [src/app/requester/stock/page.tsx](src/app/requester/stock/page.tsx)             | Igual que admin/inventario; `location="cafetin"` y lógica de inventario inicial al crear.                                                       |


---

## Long-running task

Mencionaste “long-running task”. Para esta tarea concreta no hace falta grind ni múltiples agentes; el plan anterior es acotado. Si quieres que quede documentado como parte de un flujo largo (por ejemplo, “mejoras de inventario”), se puede:

- Añadir esta implementación como ítem en `plan.md` / `todo.md` y tacharlo al terminar.
- Usar `progress_log.md` para anotar: “Crear producto (en modo edición) + eliminar en modal en admin/inventario y requester/stock”.

Si en cambio quieres que el mismo plan se ejecute en modo “grind” (tests, reintentos, etc.), se puede definir un criterio de “done” (p. ej. tests E2E de crear y eliminar) y enlazar con el skill de long-running tasks para esa parte.