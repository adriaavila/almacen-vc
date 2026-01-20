import { Id } from 'convex/_generated/dataModel';

export type PedidoStatus = 'pendiente' | 'entregado';

export type Area = 'Cocina' | 'Cafetín' | 'Limpieza';

export type ItemStatus = 'ok' | 'bajo_stock';

export type StockStatus = 'sufficient' | 'just_enough' | 'low';

export type MovementType = 'ingreso' | 'egreso';

export type MovementMotivo = 'compra' | 'consumo' | 'ajuste';

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
