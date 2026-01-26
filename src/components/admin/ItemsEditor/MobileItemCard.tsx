'use client';

import { Id } from 'convex/_generated/dataModel';
import { StatusCell } from './StatusCell';
import { Button } from '@/components/ui/Button';

type ConvexProduct = {
  _id: Id<"products">;
  name: string;
  brand: string;
  category: string;
  subCategory?: string;
  baseUnit: string;
  purchaseUnit: string;
  conversionFactor: number;
  active: boolean;
  totalStock: number;
  stockAlmacen: number;
  stockCafetin: number;
  status: "ok" | "bajo_stock";
};

interface MobileItemCardProps {
  item: any;
  tableType: 'products' | 'inventory' | 'movements';
  onItemClick: (item: any) => void;
  onDelete?: (productId: Id<"products">, productName: string) => void;
}

export function MobileItemCard({ item, tableType, onItemClick, onDelete }: MobileItemCardProps) {
  const isLowStock = tableType === 'products' 
    ? item.status === 'bajo_stock'
    : tableType === 'inventory'
    ? item.stockActual <= item.stockMinimo
    : false;

  if (tableType === 'products') {
    const product = item as ConvexProduct;
    return (
      <div
        className={`bg-white border rounded-lg p-4 shadow-sm transition-all ${
          isLowStock ? 'border-l-4 border-l-red-500 bg-red-50/30' : 'border-l-4 border-l-emerald-500'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base mb-1 truncate" title={product.name}>
              {product.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{product.category}</span>
              {product.subCategory && (
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{product.subCategory}</span>
              )}
              {product.brand && (
                <span className="text-gray-500 text-xs">{product.brand}</span>
              )}
            </div>
          </div>
          <StatusCell status={product.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
          <div>
            <span className="text-gray-500 text-xs">Unidad Base:</span>
            <p className="font-medium text-gray-900">{product.baseUnit}</p>
          </div>
          {product.purchaseUnit && (
            <div>
              <span className="text-gray-500 text-xs">Unidad Compra:</span>
              <p className="font-medium text-gray-900">{product.purchaseUnit}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500 text-xs">Stock Total:</span>
            <p className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
              {product.totalStock}
            </p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Estado:</span>
            <p className="font-medium">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                product.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {product.active ? 'Activo' : 'Inactivo'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={() => onItemClick(product)}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </Button>
          {onDelete && (
            <button
              onClick={() => onDelete(product._id, product.name)}
              className="touch-target px-4 py-2.5 rounded-md text-red-600 hover:bg-red-50 border border-red-200 bg-white transition-colors flex items-center justify-center"
              aria-label="Eliminar producto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (tableType === 'inventory') {
    return (
      <div
        className={`bg-white border rounded-lg p-4 shadow-sm transition-all ${
          isLowStock ? 'border-l-4 border-l-red-500 bg-red-50/30' : 'border-l-4 border-l-emerald-500'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base mb-1 truncate" title={item.product?.name || 'N/A'}>
              {item.product?.name || 'N/A'}
            </h3>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {item.location === 'almacen' ? 'Almacén' : item.location === 'cafetin' ? 'Cafetín' : item.location || 'N/A'}
              </span>
            </div>
          </div>
          <StatusCell status={isLowStock ? 'bajo_stock' : 'ok'} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
          <div>
            <span className="text-gray-500 text-xs">Stock Actual:</span>
            <p className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
              {item.stockActual ?? 0}
            </p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Stock Mínimo:</span>
            <p className="font-medium text-gray-900">{item.stockMinimo ?? 0}</p>
          </div>
          {item.updatedAt && (
            <div className="col-span-2">
              <span className="text-gray-500 text-xs">Actualizado:</span>
              <p className="font-medium text-gray-900 text-xs">
                {new Date(item.updatedAt).toLocaleDateString('es-ES')}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={() => onItemClick(item)}
            className="flex-1 touch-target flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </Button>
        </div>
      </div>
    );
  }

  if (tableType === 'movements') {
    return (
      <div className="bg-white border border-l-4 border-l-blue-500 rounded-lg p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base mb-1 truncate" title={item.product?.name || 'N/A'}>
              {item.product?.name || 'N/A'}
            </h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                item.type === 'COMPRA' ? 'bg-blue-100 text-blue-800' :
                item.type === 'TRASLADO' ? 'bg-purple-100 text-purple-800' :
                item.type === 'CONSUMO' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {item.type}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
          <div>
            <span className="text-gray-500 text-xs">Cantidad:</span>
            <p className="font-medium text-gray-900">{item.quantity}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Desde:</span>
            <p className="font-medium text-gray-900">{item.from || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Hacia:</span>
            <p className="font-medium text-gray-900">{item.to || '-'}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Stock Nuevo:</span>
            <p className="font-medium text-gray-900">{item.nextStock}</p>
          </div>
          {item.user && (
            <div>
              <span className="text-gray-500 text-xs">Usuario:</span>
              <p className="font-medium text-gray-900 text-xs">{item.user}</p>
            </div>
          )}
          {item.timestamp && (
            <div>
              <span className="text-gray-500 text-xs">Fecha:</span>
              <p className="font-medium text-gray-900 text-xs">
                {new Date(item.timestamp).toLocaleString('es-ES')}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
          <Button
            variant="secondary"
            onClick={() => onItemClick(item)}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Ver Detalles
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
