import { Id } from 'convex/_generated/dataModel';

export type PedidoStatus = 'pendiente' | 'entregado';

export type Area = 'Cocina' | 'Cafetín' | 'Limpieza';

export type ItemStatus = 'ok' | 'bajo_stock';

export type StockStatus = 'sufficient' | 'just_enough' | 'low';

export type MovementType = 'ingreso' | 'egreso';

export type MovementMotivo = 'compra' | 'consumo' | 'ajuste' | 'mantenimiento';

export interface DeliveryResult {
  deliveredItems: Array<{ itemId: string; cantidad: number; newStock: number }>;
  lowStockItems: Array<{ itemId: string; nombre: string; stock_actual: number; stock_minimo: number }>;
}

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
  sharedAreas?: string[]; // Areas that can see this item: ["Cocina", "Cafetín", "Limpieza"]
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

export interface StockMovement {
  _id: Id<'stock_movements'>;
  itemId: Id<'items'>;
  type: MovementType;
  cantidad: number;
  motivo: MovementMotivo;
  referencia?: string;
  createdAt: number;
  createdBy?: string;
  // Populated fields
  item?: Item;
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
