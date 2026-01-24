# Almacén – Control de stock y operaciones internas

**Cliente:** Vistacampo Centro Terapéutico  
**Tipo de proyecto:** Aplicación web interna (inventario, pedidos, mantenimiento)

---

## Contexto y reto

Las áreas operativas de Vistacampo (Cocina, Cafetín, Limpieza) necesitan solicitar insumos de forma ágil. El almacén debe entregar pedidos y controlar el stock con visibilidad clara y alertas cuando los ítems bajan del mínimo. El reto era disponer de un sistema **operativo**, **intuitivo** y **escalable** que reemplazara procesos manuales o dispersos, sin requerir capacitación.

---

## Solución

Se construyó una aplicación web con roles diferenciados (Solicitante, Admin, Mantenimiento y Owner). Incluye flujo completo de pedidos internos, inventario editable con filtros y alertas de stock bajo, módulo de mantenimiento (activos, repuestos y trabajos), punto de venta (POS) para solicitudes rápidas, y un dashboard de analytics para la gerencia con gráficos, exportación a CSV y filtros por rango de fechas.

---

## Funcionalidades principales

- **Solicitantes** (`/requester/*`): crear pedidos, consultar mis pedidos, POS, consulta de stock, gestión de usuarios.
- **Administración** (`/admin/*`): pedidos pendientes y entrega, inventario (editor, filtros, importación CSV), movimientos de stock, mantenimiento (activos, repuestos, trabajos), dashboard y seed de datos.
- **Mantenimiento** (standalone): activos, repuestos, ingreso de repuestos, trabajos de mantenimiento.
- **Owner** (`/owner`): dashboard con estadísticas, gráficos (consumo por área, tendencias de pedidos, movimientos de stock, salud de inventario), tabla de ítems más pedidos, envejecimiento de pedidos pendientes, exportación CSV y filtro por rango de fechas.

---

## Stack técnico

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4, Radix UI, Recharts.
- **Backend y datos:** Convex.
- **Estado:** Zustand.
- **Idioma:** Interfaz en español.

---

## Diseño y UX

- **Paleta:** esmeralda (#10b981), teal (#14b8a6), escala de grises.
- **Tipografía:** Inter, jerarquía clara H1–H6.
- **Componentes:** botones primarios y secundarios, badges de estado, tablas, formularios. UI diferenciada por rol para que cada usuario encuentre solo lo que necesita.

---

## Resultado

Vistacampo dispone de una herramienta única para operaciones internas: pedidos, inventario, mantenimiento y visibilidad gerencial en un mismo producto. El flujo se entiende sin explicación y está listo para evolucionar con autenticación, roles reales y nuevas funcionalidades.

[Ver demo en vivo](#)

---

*Desarrollado por [Nombre de la agencia].*
