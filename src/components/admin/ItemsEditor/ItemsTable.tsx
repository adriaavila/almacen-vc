'use client';

import { useMemo } from 'react';
import { Id } from 'convex/_generated/dataModel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EditableCell } from './EditableCell';
import { StatusCell } from './StatusCell';
import { ColumnHeaderFilter } from './ColumnHeaderFilter';
import { ColumnConfig } from '@/types';

type ConvexProduct = {
  _id: Id<"products">;
  name: string;
  brand: string;
  category: string;
  subCategory?: string;
  baseUnit: string;
  purchaseUnit: string;
  conversionFactor: number;
  packageSize: number;
  active: boolean;
  totalStock: number;
  stockAlmacen: number;
  stockCafetin: number;
  status: "ok" | "bajo_stock";
};

interface ItemsTableProps {
  items: ConvexProduct[];
  columns: ColumnConfig[];
  onItemClick: (item: ConvexProduct) => void;
  onFieldUpdate: (productId: Id<"products">, field: string, value: string | number | boolean | undefined) => Promise<void>;
  categories: string[];
  subcategories: string[];
  columnFilters: {
    name?: string;
    category?: string[];
    subCategory?: string[];
    brand?: string[];
    baseUnit?: string[];
    totalStock?: { min?: number; max?: number };
    stockAlmacen?: { min?: number; max?: number };
    packageSize?: string;
    status?: ('ok' | 'bajo_stock')[];
    active?: boolean[];
  };
  onColumnFilterChange: (columnKey: string, value: string | string[] | boolean[] | { min?: number; max?: number } | undefined) => void;
  columnFilterOptions: {
    marcas: string[];
    unidades: string[];
    locations: string[];
  };
  onClearAllColumnFilters: () => void;
}

export function ItemsTable({
  items,
  columns,
  onItemClick,
  onFieldUpdate,
  categories,
  subcategories,
  columnFilters,
  onColumnFilterChange,
  columnFilterOptions,
  onClearAllColumnFilters,
}: ItemsTableProps) {
  // Sort columns by order
  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => a.order - b.order).filter(col => col.visible);
  }, [columns]);

  const handleFieldUpdate = async (productId: Id<"products">, field: string, value: string | number | boolean | undefined) => {
    await onFieldUpdate(productId, field, value);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200 shadow-sm">
            <TableRow className="hover:bg-transparent">
              {sortedColumns.map((column) => {
                const isRequired = ['name', 'category', 'baseUnit'].includes(column.key);
                return (
                  <TableHead key={column.key} className="font-semibold text-gray-700 py-2 px-4 text-sm uppercase tracking-wider">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        {column.label}
                        {isRequired && <span className="text-red-500">*</span>}
                      </div>
                      {(() => {
                        switch (column.key) {
                          case 'name':
                            return (
                              <ColumnHeaderFilter
                                columnKey="name"
                                filterType="text"
                                value={columnFilters.name}
                                onChange={(value) => onColumnFilterChange('name', value as string)}
                                placeholder="Buscar nombre..."
                              />
                            );
                          case 'category':
                            return (
                              <ColumnHeaderFilter
                                columnKey="category"
                                filterType="dropdown"
                                options={categories}
                                value={columnFilters.category}
                                onChange={(value) => onColumnFilterChange('category', value as string[])}
                                placeholder="Filtrar categoría"
                              />
                            );
                          case 'subCategory':
                            return (
                              <ColumnHeaderFilter
                                columnKey="subCategory"
                                filterType="dropdown"
                                options={subcategories}
                                value={columnFilters.subCategory}
                                onChange={(value) => onColumnFilterChange('subCategory', value as string[])}
                                placeholder="Filtrar subcategoría"
                              />
                            );
                          case 'brand':
                            return (
                              <ColumnHeaderFilter
                                columnKey="brand"
                                filterType="dropdown"
                                options={columnFilterOptions.marcas}
                                value={columnFilters.brand}
                                onChange={(value) => onColumnFilterChange('brand', value as string[])}
                                placeholder="Filtrar marca"
                              />
                            );
                          case 'baseUnit':
                            return (
                              <ColumnHeaderFilter
                                columnKey="baseUnit"
                                filterType="dropdown"
                                options={columnFilterOptions.unidades}
                                value={columnFilters.baseUnit}
                                onChange={(value) => onColumnFilterChange('baseUnit', value as string[])}
                                placeholder="Filtrar unidad"
                              />
                            );
                          case 'totalStock':
                            return (
                              <ColumnHeaderFilter
                                columnKey="totalStock"
                                filterType="number-range"
                                value={columnFilters.totalStock}
                                onChange={(value) => onColumnFilterChange('totalStock', value as { min?: number; max?: number })}
                              />
                            );
                          case 'stockAlmacen':
                            return (
                              <ColumnHeaderFilter
                                columnKey="stockAlmacen"
                                filterType="number-range"
                                value={columnFilters.stockAlmacen}
                                onChange={(value) => onColumnFilterChange('stockAlmacen', value as { min?: number; max?: number })}
                              />
                            );
                          case 'packageSize':
                            return (
                              <ColumnHeaderFilter
                                columnKey="packageSize"
                                filterType="text"
                                value={columnFilters.packageSize}
                                onChange={(value) => onColumnFilterChange('packageSize', value as string)}
                                placeholder="Buscar tamaño..."
                              />
                            );
                          case 'status':
                            return (
                              <ColumnHeaderFilter
                                columnKey="status"
                                filterType="dropdown"
                                options={['OK', 'Bajo Stock']}
                                value={columnFilters.status?.map(s => s === 'ok' ? 'OK' : 'Bajo Stock')}
                                onChange={(value) => {
                                  const statusValues = Array.isArray(value)
                                    ? value.map(v => v === 'OK' ? 'ok' as const : 'bajo_stock' as const)
                                    : undefined;
                                  onColumnFilterChange('status', statusValues);
                                }}
                                placeholder="Filtrar estado"
                              />
                            );
                          case 'active':
                            return (
                              <ColumnHeaderFilter
                                columnKey="active"
                                filterType="dropdown"
                                options={['Activo', 'Inactivo']}
                                value={columnFilters.active?.map(a => a ? 'Activo' : 'Inactivo')}
                                onChange={(value) => {
                                  const activeValues = Array.isArray(value)
                                    ? value.map(v => v === 'Activo')
                                    : undefined;
                                  onColumnFilterChange('active', activeValues);
                                }}
                                placeholder="Filtrar activo"
                              />
                            );
                          default:
                            return null;
                        }
                      })()}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
            {(Object.keys(columnFilters).length > 0 && Object.values(columnFilters).some(v => v !== undefined && (Array.isArray(v) ? v.length > 0 : true))) && (
              <TableRow className="hover:bg-transparent border-t border-gray-200">
                <TableCell colSpan={sortedColumns.length} className="py-2 px-4">
                  <button
                    onClick={onClearAllColumnFilters}
                    className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpiar todos los filtros de columna
                  </button>
                </TableCell>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={sortedColumns.length} className="text-center py-12 text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-sm font-medium">No hay productos para mostrar</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((product) => {
                const isLowStock = product.status === 'bajo_stock';
                return (
                  <TableRow
                    key={product._id}
                    className={`transition-all duration-150 hover:bg-emerald-50/50 ${
                      isLowStock ? 'border-l-4 border-l-red-500 bg-red-50/30' : 'border-l-4 border-l-emerald-500'
                    }`}
                  >
                    {sortedColumns.map((column) => {
                      const cellKey = `${product._id}-${column.key}`;
                      
                      return (
                        <TableCell key={cellKey} className="py-3 px-4">
                          <div className="min-h-10 flex items-center">
                      {(() => {
                      switch (column.key) {
                        case 'name':
                          return (
                              <EditableCell
                                value={product.name}
                                type="text"
                                required={true}
                                onSave={(value) => handleFieldUpdate(product._id, 'name', value as string)}
                              />
                          );
                        case 'category':
                          return (
                              <EditableCell
                                value={product.category}
                                type="select"
                                options={categories}
                                required={true}
                                onSave={(value) => handleFieldUpdate(product._id, 'category', value as string)}
                              />
                          );
                        case 'baseUnit':
                          return (
                              <EditableCell
                                value={product.baseUnit}
                                type="text"
                                required={true}
                                onSave={(value) => handleFieldUpdate(product._id, 'baseUnit', value as string)}
                              />
                          );
                        case 'totalStock':
                          return (
                              <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                                {product.totalStock}
                              </span>
                          );
                        case 'stockAlmacen':
                          return (
                              <span className="text-gray-900">
                                {product.stockAlmacen}
                              </span>
                          );
                        case 'subCategory':
                          return (
                              <EditableCell
                                value={product.subCategory || ''}
                                type="text"
                                allowEmpty={true}
                                placeholder="Opcional"
                                onSave={(value) => handleFieldUpdate(product._id, 'subCategory', value as string || undefined)}
                              />
                          );
                        case 'brand':
                          return (
                              <EditableCell
                                value={product.brand || ''}
                                type="text"
                                allowEmpty={true}
                                placeholder="Opcional"
                                onSave={(value) => handleFieldUpdate(product._id, 'brand', value as string || undefined)}
                              />
                          );
                        case 'packageSize':
                          return (
                              <EditableCell
                                value={product.packageSize.toString()}
                                type="number"
                                allowEmpty={true}
                                placeholder="0"
                                onSave={(value) => handleFieldUpdate(product._id, 'packageSize', parseFloat(value as string) || 0)}
                              />
                          );
                        case 'status':
                          return (
                              <StatusCell status={product.status} />
                          );
                        case 'active':
                          return (
                              <EditableCell
                                value={product.active}
                                type="toggle"
                                onSave={(value) => handleFieldUpdate(product._id, 'active', value as boolean)}
                              />
                          );
                        case 'acciones':
                          return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onItemClick(product);
                                }}
                                className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Abrir editor completo"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                          );
                        default:
                          return (
                              <span className="text-sm text-gray-600">
                                {String((product as any)[column.key] || '')}
                              </span>
                          );
                      }
                      })()}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
