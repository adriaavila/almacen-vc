export type PedidoStatus = 'pendiente' | 'entregado';

export type Area = 'Cocina' | 'Cafetín' | 'Limpieza';

export type ItemStatus = 'ok' | 'bajo_stock';

export type StockStatus = 'sufficient' | 'just_enough' | 'low';

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
