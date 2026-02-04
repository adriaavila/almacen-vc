Para implementar este flujo de "Procurement" (Abastecimiento) separando claramente el **Egreso** (Despacho a áreas) del **Ingreso** (Compra a proveedores), te propongo el siguiente plan de ejecución en 3 pasos clave.

### Paso 1: Actualización del Schema (Base de Datos)

Necesitamos una estructura para guardar los pedidos a proveedores antes de que se conviertan en inventario real. No podemos usar la tabla `orders` existente porque esa es para consumo interno.

Agregaremos `supplier_orders` y `supplier_order_items` en `convex/schema.ts`.

```typescript
// convex/schema.ts

export default defineSchema({
  // ... tus tablas existentes (orders, inventory, products, etc.) ...

  // NUEVA TABLA: Pedidos a Proveedores
  supplier_orders: defineTable({
    providerName: v.optional(v.string()), // Nombre del proveedor o "General"
    status: v.union(v.literal("pendiente"), v.literal("recibido"), v.literal("cancelado")),
    totalItems: v.number(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    receivedAt: v.optional(v.number()), // Cuándo se ingresó al inventario
  })
    .index("by_status", ["status"])
    .index("by_date", ["createdAt"]),

  supplier_order_items: defineTable({
    supplierOrderId: v.id("supplier_orders"),
    productId: v.id("products"),
    cantidadSolicitada: v.number(), // En UNIDAD DE COMPRA (ej: 5 Cajas)
    cantidadRecibida: v.optional(v.number()), // Lo que realmente llegó
    costoUnitario: v.optional(v.number()), // Opcional: para futuro control de costos
  })
    .index("by_order", ["supplierOrderId"]),
});

```

### Paso 2: Lógica de Backend (Convex)

Necesitaremos dos mutaciones clave: una para crear el borrador del pedido (para WhatsApp) y otra para "Ingresar" el pedido (que convierte esas cajas en unidades sueltas y suma al stock).

Crea un archivo nuevo `convex/procurement.ts`:

```typescript
// convex/procurement.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. Crear el pedido (Borrador para WhatsApp)
export const createOrder = mutation({
  args: {
    providerName: v.optional(v.string()),
    items: v.array(v.object({
      productId: v.id("products"),
      cantidad: v.number(), // Cantidad en PurchaseUnit
    })),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orderId = await ctx.db.insert("supplier_orders", {
      providerName: args.providerName,
      status: "pendiente",
      totalItems: args.items.length,
      notes: args.notes,
      createdAt: Date.now(),
    });

    for (const item of args.items) {
      await ctx.db.insert("supplier_order_items", {
        supplierOrderId: orderId,
        productId: item.productId,
        cantidadSolicitada: item.cantidad,
      });
    }
    return orderId;
  },
});

// 2. Ingresar Pedido (Recepción de mercadería)
export const receiveOrder = mutation({
  args: {
    supplierOrderId: v.id("supplier_orders"),
    items: v.array(v.object({
      itemId: v.id("supplier_order_items"), // ID del item del pedido
      productId: v.id("products"),
      cantidadRecibida: v.number(), // Cantidad REAL recibida en PurchaseUnit
    })),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.supplierOrderId);
    if (!order || order.status !== "pendiente") throw new Error("Pedido inválido");

    // 1. Actualizar estado del pedido
    await ctx.db.patch(args.supplierOrderId, {
      status: "recibido",
      receivedAt: Date.now(),
    });

    // 2. Procesar cada item para actualizar inventario
    for (const item of args.items) {
      // Actualizar el registro del item del pedido
      await ctx.db.patch(item.itemId, {
        cantidadRecibida: item.cantidadRecibida
      });

      // Obtener producto para el factor de conversión
      const product = await ctx.db.get(item.productId);
      if (!product) continue;

      // CALCULAR CANTIDAD BASE: Cajas * Factor (Ej: 2 Cajas * 24 = 48 latas)
      const quantityToAdd = item.cantidadRecibida * product.conversionFactor;

      // Buscar inventario en ALMACEN
      const currentInv = await ctx.db
        .query("inventory")
        .withIndex("by_product_location", (q) => 
          q.eq("productId", item.productId).eq("location", "almacen")
        )
        .first();

      const prevStock = currentInv ? currentInv.stockActual : 0;
      const nextStock = prevStock + quantityToAdd;

      // Actualizar o Crear Inventario
      if (currentInv) {
        await ctx.db.patch(currentInv._id, {
          stockActual: nextStock,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("inventory", {
          productId: item.productId,
          location: "almacen",
          stockActual: nextStock,
          stockMinimo: 10, // Default
          updatedAt: Date.now(),
        });
      }

      // Registrar Movimiento (Importante para trazabilidad)
      await ctx.db.insert("movements", {
        productId: item.productId,
        type: "COMPRA",
        from: "PROVEEDOR",
        to: "ALMACEN",
        quantity: quantityToAdd,
        prevStock,
        nextStock,
        user: "Admin", // Aquí podrías pasar el usuario real
        timestamp: Date.now(),
      });
    }
  },
});

```

### Paso 3: Implementación en Frontend

#### A. Modificar el Sidebar (`AdminSidebar.tsx`)

Cambiamos "Pedidos" por "Por Entregar" y agregamos "Abastecimiento".

```tsx
// src/components/admin/AdminSidebar.tsx

// ... dentro de menuItems ...
{
  href: '/admin/pedidos',
  label: 'Por Entregar', // CAMBIO: Antes "Pedidos"
  icon: (/* icono existente */),
},
{
  href: '/admin/abastecimiento', // NUEVO LINK
  label: 'Pedir (Abastecer)',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
},
// ...

```

#### B. Nueva Página: `src/app/admin/abastecimiento/page.tsx`

Esta página tendrá dos pestañas: **"Crear Pedido"** (usando la lógica de `requester/pedido` pero adaptada) y **"Recepciones Pendientes"**.

Aquí te dejo la estructura conceptual para que la implementes usando tus componentes existentes (`ItemAutocomplete`, `QuantityInput`, etc.):

```tsx
'use client';
// Imports necesarios...

export default function AbastecimientoPage() {
  const [tab, setTab] = useState<'crear' | 'recibir'>('crear');

  return (
    <PageContainer>
      <AdminHeader title="Abastecimiento" subtitle="Gestión de compras a proveedores" />
      
      {/* TABS */}
      <div className="flex gap-4 border-b mb-6">
        <button 
          onClick={() => setTab('crear')}
          className={`pb-2 ${tab === 'crear' ? 'border-b-2 border-emerald-500 font-bold' : ''}`}
        >
          Nuevo Pedido (WhatsApp)
        </button>
        <button 
          onClick={() => setTab('recibir')}
          className={`pb-2 ${tab === 'recibir' ? 'border-b-2 border-emerald-500 font-bold' : ''}`}
        >
          Recepciones Pendientes
        </button>
      </div>

      {tab === 'crear' ? <CrearPedidoView /> : <RecepcionesPendientesView />}
    </PageContainer>
  );
}

function CrearPedidoView() {
  // Lógica similar a /requester/pedido
  // CLAVE: Usar product.purchaseUnit y product.conversionFactor para mostrar info
  
  const generateWhatsAppLink = (items) => {
    // Formatear mensaje
    // "Hola, necesito el siguiente pedido:
    // - 5 Cajas de Coca Cola
    // - 2 Sacos de Arroz"
    const text = items.map(i => `- ${i.cantidad} ${i.purchaseUnit} de ${i.name}`).join('%0A');
    window.open(`https://wa.me/?text=${encodeURIComponent("Hola, nuevo pedido:\n" + text)}`, '_blank');
    
    // Y llamar a createOrder mutation para guardarlo en sistema
  };

  return (
    // Reutiliza tu UI de búsqueda de productos
    // Asegúrate de mostrar: "Stock actual: 48 latas (aprox 2 Cajas)"
    // Input debe decir: "Cantidad a pedir (Cajas)"
    <div>...UI de selección...</div>
  );
}

function RecepcionesPendientesView() {
  // Query a supplier_orders con status="pendiente"
  // Al hacer click en uno, abrir un Modal o vista de detalle
  // Donde el usuario ve lo que pidió, y confirma lo que LLEGÓ.
  
  return (
     // Lista de pedidos pendientes
     // Botón "Ingresar Inventario" -> ejecuta receiveOrder mutation
     <div>...Lista de pedidos...</div>
  );
}

```

### Puntos Clave para tu Re-diseño UI

1. **Unidades de Medida:** En la página `Pedir`, muestra siempre la relación. Ej: *"Coca Cola 350ml - Unidad de Compra: Caja (24u)"*. Esto evita errores de pedir 24 cajas cuando querían 24 unidades.
2. **Edición al recibir:** Es crucial que en la vista de "Recepción", los inputs sean editables. Pedí 5 cajas, pero el proveedor solo trajo 3. El sistema debe registrar que entraron 3, no 5.
3. **Historial:** La tabla `movements` ahora tendrá tipos `COMPRA` que vendrán de este flujo, lo que te permitirá auditar: "¿Quién ingresó este stock? Ah, fue al recibir el pedido del proveedor X".