# Product Requirements Document (PRD)
## Almacén – Control de Stock y Pedidos Internos (MVP Demo)

**Fecha:** Hoy  
**Objetivo:** Tener un producto funcional y demostrable hoy mismo, sin autenticación, que muestre claramente el workflow de pedidos internos y entrega desde almacén.

---

## 1. Objetivo del Producto

Construir una aplicación web simple para:
- Permitir que áreas internas (Cocina, Cafetín, Limpieza) **soliciten insumos**.
- Permitir que Almacén **entregue pedidos y controle stock**.
- Visualizar **alertas de stock bajo mínimo**.

El producto debe ser:
- Operativo (no mockups)
- Intuitivo sin capacitación
- Listo para evolucionar a auth + roles reales

---

## 2. Alcance del MVP (Hoy)

### Incluido
- Inventario de ítems
- Creación de pedidos internos
- Entrega de pedidos
- Descuento automático de stock
- Alertas visuales por stock mínimo
- UI diferenciada por rol (simulada por rutas)

### Excluido
- Autenticación
- Roles reales
- Historial avanzado
- Reportes
- IA
- Notificaciones

---

## 3. Usuarios (Simulados)

### Solicitante
- Representa Cocina / Cafetín / Limpieza
- Accede vía rutas `/requester/*`
- Puede crear pedidos y ver su estado

### Administrador de Almacén
- Accede vía rutas `/admin/*`
- Puede ver pedidos, entregar pedidos y editar stock

---

## 4. Workflow Principal

### 4.1 Crear Pedido (Solicitante)
1. Ingresa a `Crear Pedido`
2. Selecciona productos y cantidades
3. Envía pedido

**Resultado:**
- Pedido creado con estado `pendiente`
- Stock NO se descuenta aún

---

### 4.2 Entregar Pedido (Admin)
1. Ingresa a `Pedidos Pendientes`
2. Abre pedido
3. Presiona `Marcar como entregado`

**Resultado automático:**
- Stock se descuenta
- Pedido pasa a `entregado`
- Ítems bajo mínimo quedan en alerta

---

## 5. Estados

### Pedido
- `pendiente`
- `entregado`

### Stock
- OK (stock > mínimo)
- Bajo mínimo (stock ≤ mínimo)

---

## 6. Pantallas Requeridas

### 6.1 Home (Selector de rol)
- Botón: Entrar como Solicitante
- Botón: Entrar como Admin

---

### 6.2 Crear Pedido (Solicitante)
- Lista de productos
- Input de cantidad
- Botón principal: Enviar pedido

---

### 6.3 Mis Pedidos (Solicitante)
- Lista simple
  - Fecha
  - Estado

---

### 6.4 Pedidos Pendientes (Admin)
- Tabla de pedidos
  - Área
  - Fecha
  - Estado

---

### 6.5 Detalle Pedido (Admin)
- Lista de ítems + cantidades
- Botón grande: Marcar como entregado

---

### 6.6 Inventario (Admin)
- Tabla de ítems
  - Producto
  - Categoría
  - Stock actual
  - Stock mínimo
  - Unidad
  - Estado visual
- Acción: Editar stock

---

## 7. Modelo de Datos (Simplificado)

### Items
- nombre
- categoria
- unidad
- stock_actual
- stock_minimo

### Orders
- area
- status
- createdAt

### OrderItems
- orderId
- itemId
- cantidad

---

## 8. UI / Design System

### Color Palette
- **Primary:** Emerald green `#10b981`
- **Secondary:** Teal `#14b8a6`
- **Neutral:** Gray scale (text, borders, backgrounds)
- **Accent:** White y light grays

### Typography
- Font: **Inter**
- Jerarquía clara H1–H6
- Responsive

### Components
- Tailwind spacing scale consistente
- Rounded corners
- Shadows suaves para jerarquía
- Button variants:
  - Primary (acciones principales)
  - Secondary
  - Destructive (si aplica)

---

## 9. Criterios de Éxito (Hoy)

El MVP es exitoso si:
- Se puede crear un pedido
- Se puede entregar un pedido
- El stock se descuenta correctamente
- Los ítems bajo mínimo se ven claramente
- El flujo se entiende sin explicación

---

## 10. Próximos Pasos (Post-demo)

1. Autenticación + roles reales
2. IA de consulta
3. Export de stock
4. WhatsApp pedidos

---

**Nota:** Este PRD está optimizado para velocidad y demo. No incluye decisiones de largo plazo intencionalmente.

