import { Id } from 'convex/_generated/dataModel';

export type PedidoStatus = 'pendiente' | 'entregado';

export type Area = 'Cocina' | 'Cafetin' | 'Limpieza';

export type ItemStatus = 'ok' | 'bajo_stock';

export type StockStatus = 'sufficient' | 'just_enough' | 'low';

// DEPRECATED: Legacy movement types (stock_movements table no longer exists)
export type LegacyMovementType = 'ingreso' | 'egreso';
export type MovementMotivo = 'compra' | 'consumo' | 'ajuste' | 'mantenimiento';

// New movement types (for new movements table)
export type MovementType = 'COMPRA' | 'TRASLADO' | 'CONSUMO' | 'AJUSTE';

// Location type for multi-location inventory
export type InventoryLocation = 'almacen' | 'cafetin';

export interface DeliveryResult {
  deliveredItems: Array<{ itemId: string; cantidad: number; newStock: number }>; // itemId is actually productId
  lowStockItems: Array<{ itemId: string; nombre: string; stock_actual: number; stock_minimo: number }>; // itemId is actually productId
}

// DEPRECATED: Item interface - use Product instead
export interface Item {
  id: string;
  nombre: string;
  categoria: string;
  subcategoria?: string;
  marca?: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  package_size?: string;
  location: string;
  extra_notes?: string;
  status: ItemStatus;
  sharedAreas?: string[]; // Areas that can see this item: ["Cocina", "Cafetin", "Limpieza"]
  updatedBy?: string;
  updatedAt?: number;
}

export interface PedidoItem {
  orderId: string;
  itemId: string;
  cantidad: number;
}

export interface Pedido {
  id: string;
  area: Area;
  status: PedidoStatus;
  createdAt: Date;
  items?: Item[]; // Populated when needed
}

// DEPRECATED: StockMovement interface - stock_movements table no longer exists, use Movement instead
export interface StockMovement {
  _id: string; // Changed from Id<'stock_movements'> since table no longer exists
  itemId: string; // Changed from Id<'items'> since items table no longer exists
  type: LegacyMovementType;
  cantidad: number;
  motivo: MovementMotivo;
  referencia?: string;
  createdAt: number;
  createdBy?: string;
  // Populated fields
  item?: Item;
}

// ============================================================
// NEW INVENTORY SYSTEM TYPES (Multi-location with unit conversion)
// ============================================================

// Product - Master catalog (replaces Item for product definition)
export interface Product {
  _id: Id<'products'>;
  name: string;
  brand: string;
  category: string;
  subCategory?: string;
  baseUnit: string;        // Consumption unit (unidad, gr, ml)
  purchaseUnit: string;    // Purchase unit (caja, fardo, saco)
  conversionFactor: number; // How many baseUnits in purchaseUnit
  active: boolean;
  availableForSale?: boolean; // Available for sale in POS (defaults to true)
}

// Product with aggregated inventory (from products.listWithInventory)
export interface ProductWithInventory extends Product {
  totalStock: number;      // Sum across all locations
  stockAlmacen: number;    // Stock at almacen
  stockCafetin: number;    // Stock at cafetin
  status: ItemStatus;      // Calculated: 'ok' | 'bajo_stock'
}

// Product with detailed inventory per location (from products.getWithInventory)
export interface ProductWithDetailedInventory extends Product {
  inventory: Array<{
    location: InventoryLocation;
    stockActual: number;
    stockMinimo: number;
    updatedAt: number;
  }>;
  totalStock: number;
}

// Inventory record - Stock at a specific location
export interface Inventory {
  _id: Id<'inventory'>;
  productId: Id<'products'>;
  location: InventoryLocation;
  stockActual: number;     // Always in baseUnit
  stockMinimo: number;
  updatedAt: number;
  // Populated field
  product?: Product;
}

// Movement - Audit trail for inventory changes
export interface Movement {
  _id: Id<'movements'>;
  productId: Id<'products'>;
  type: MovementType;
  from?: string;           // "PROVEEDOR", "ALMACEN", or undefined
  to: string;              // "ALMACEN", "CAFETIN", or destination
  quantity: number;        // Always in baseUnit
  prevStock: number;
  nextStock: number;
  user: string;
  timestamp: number;
  orderId?: Id<'orders'>;  // Relación con pedido (si el movimiento viene de entregar un pedido)
  // Populated field
  product?: Product;
}

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface ItemsEditorConfig {
  columns: ColumnConfig[];
  showOnlyActive: boolean;
}

export type ActivoEstado = 'operativo' | 'en_reparacion' | 'fuera_servicio';

export type TrabajoTipo = 'preventivo' | 'correctivo' | 'emergencia';

export type TrabajoEstado = 'pendiente' | 'en_proceso' | 'completado';

export interface Activo {
  _id: string;
  nombre: string;
  tipo: string;
  ubicacion: string;
  estado: ActivoEstado;
  descripcion?: string;
  fecha_instalacion?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Repuesto {
  _id: string;
  nombre: string;
  categoria: string;
  marca?: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  ubicacion: string;
  descripcion?: string;
  activo_id?: string;
  status: ItemStatus;
  createdAt: number;
  updatedAt: number;
}

export interface TrabajoMantenimiento {
  _id: string;
  activo_id: string;
  tipo: TrabajoTipo;
  descripcion: string;
  estado: TrabajoEstado;
  fecha_inicio?: number;
  fecha_fin?: number;
  tecnico?: string;
  observaciones?: string;
  createdAt: number;
  updatedAt: number;
  // Populated fields
  activo?: Activo;
  repuestos?: Array<{
    repuesto: Repuesto;
    cantidad: number;
  }>;
}

export interface ConsumoRepuesto {
  _id: string;
  trabajo_id: string;
  repuesto_id: string;
  cantidad: number;
  createdAt: number;
  // Populated fields
  repuesto?: Repuesto;
}

// POS Multi-Slot Types
export interface CartItem {
  productId: Id<"products">; // Use only productId
  nombre: string;
  cantidad: number;
  precio: number;
  unidad: string;
}

export interface Slot {
  id: number; // 1-5
  pacienteId: string | null;
  items: CartItem[];
}

export interface Paciente {
  id: string;
  nombre: string;
}
