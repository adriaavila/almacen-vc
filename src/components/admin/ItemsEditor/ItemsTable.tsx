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

type ConvexItem = {
  _id: Id<"items">;
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
  status: "ok" | "bajo_stock";
  active?: boolean;
  updatedBy?: string;
  updatedAt?: number;
};

interface ItemsTableProps {
  items: ConvexItem[];
  columns: ColumnConfig[];
  onItemClick: (item: ConvexItem) => void;
  onFieldUpdate: (itemId: Id<"items">, field: string, value: string | number | boolean | undefined) => Promise<void>;
  categories: string[];
  subcategories: string[];
  columnFilters: {
    nombre?: string;
    categoria?: string[];
    subcategoria?: string[];
    marca?: string[];
    unidad?: string[];
    location?: string[];
    stock_actual?: { min?: number; max?: number };
    stock_minimo?: { min?: number; max?: number };
    package_size?: string;
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

  const handleFieldUpdate = async (itemId: Id<"items">, field: string, value: string | number | boolean | undefined) => {
    await onFieldUpdate(itemId, field, value);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200 shadow-sm">
            <TableRow className="hover:bg-transparent">
              {sortedColumns.map((column) => {
                const isRequired = ['nombre', 'categoria', 'unidad', 'location'].includes(column.key);
                return (
                  <TableHead key={column.key} className="font-semibold text-gray-700 py-2 px-4 text-sm uppercase tracking-wider">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        {column.label}
                        {isRequired && <span className="text-red-500">*</span>}
                      </div>
                      {(() => {
                        switch (column.key) {
                          case 'nombre':
                            return (
                              <ColumnHeaderFilter
                                columnKey="nombre"
                                filterType="text"
                                value={columnFilters.nombre}
                                onChange={(value) => onColumnFilterChange('nombre', value as string)}
                                placeholder="Buscar nombre..."
                              />
                            );
                          case 'categoria':
                            return (
                              <ColumnHeaderFilter
                                columnKey="categoria"
                                filterType="dropdown"
                                options={categories}
                                value={columnFilters.categoria}
                                onChange={(value) => onColumnFilterChange('categoria', value as string[])}
                                placeholder="Filtrar categoría"
                              />
                            );
                          case 'subcategoria':
                            return (
                              <ColumnHeaderFilter
                                columnKey="subcategoria"
                                filterType="dropdown"
                                options={subcategories}
                                value={columnFilters.subcategoria}
                                onChange={(value) => onColumnFilterChange('subcategoria', value as string[])}
                                placeholder="Filtrar subcategoría"
                              />
                            );
                          case 'marca':
                            return (
                              <ColumnHeaderFilter
                                columnKey="marca"
                                filterType="dropdown"
                                options={columnFilterOptions.marcas}
                                value={columnFilters.marca}
                                onChange={(value) => onColumnFilterChange('marca', value as string[])}
                                placeholder="Filtrar marca"
                              />
                            );
                          case 'unidad':
                            return (
                              <ColumnHeaderFilter
                                columnKey="unidad"
                                filterType="dropdown"
                                options={columnFilterOptions.unidades}
                                value={columnFilters.unidad}
                                onChange={(value) => onColumnFilterChange('unidad', value as string[])}
                                placeholder="Filtrar unidad"
                              />
                            );
                          case 'location':
                            return (
                              <ColumnHeaderFilter
                                columnKey="location"
                                filterType="dropdown"
                                options={columnFilterOptions.locations}
                                value={columnFilters.location}
                                onChange={(value) => onColumnFilterChange('location', value as string[])}
                                placeholder="Filtrar ubicación"
                              />
                            );
                          case 'stock_actual':
                            return (
                              <ColumnHeaderFilter
                                columnKey="stock_actual"
                                filterType="number-range"
                                value={columnFilters.stock_actual}
                                onChange={(value) => onColumnFilterChange('stock_actual', value as { min?: number; max?: number })}
                              />
                            );
                          case 'stock_minimo':
                            return (
                              <ColumnHeaderFilter
                                columnKey="stock_minimo"
                                filterType="number-range"
                                value={columnFilters.stock_minimo}
                                onChange={(value) => onColumnFilterChange('stock_minimo', value as { min?: number; max?: number })}
                              />
                            );
                          case 'package_size':
                            return (
                              <ColumnHeaderFilter
                                columnKey="package_size"
                                filterType="text"
                                value={columnFilters.package_size}
                                onChange={(value) => onColumnFilterChange('package_size', value as string)}
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
                    <p className="text-sm font-medium">No hay items para mostrar</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isLowStock = item.status === 'bajo_stock';
                return (
                  <TableRow
                    key={item._id}
                    className={`transition-all duration-150 hover:bg-emerald-50/50 ${
                      isLowStock ? 'border-l-4 border-l-red-500 bg-red-50/30' : 'border-l-4 border-l-emerald-500'
                    }`}
                  >
                    {sortedColumns.map((column) => {
                      const cellKey = `${item._id}-${column.key}`;
                      
                      return (
                        <TableCell key={cellKey} className="py-3 px-4">
                          <div className="min-h-10 flex items-center">
                      {(() => {
                      switch (column.key) {
                        case 'nombre':
                          return (
                              <EditableCell
                                value={item.nombre}
                                type="text"
                                required={true}
                                onSave={(value) => handleFieldUpdate(item._id, 'nombre', value as string)}
                              />
                          );
                        case 'categoria':
                          return (
                              <EditableCell
                                value={item.categoria}
                                type="select"
                                options={categories}
                                required={true}
                                onSave={(value) => handleFieldUpdate(item._id, 'categoria', value as string)}
                              />
                          );
                        case 'unidad':
                          return (
                              <EditableCell
                                value={item.unidad}
                                type="text"
                                required={true}
                                onSave={(value) => handleFieldUpdate(item._id, 'unidad', value as string)}
                              />
                          );
                        case 'stock_actual':
                          return (
                              <EditableCell
                                value={item.stock_actual}
                                type="number"
                                onSave={(value) => handleFieldUpdate(item._id, 'stock_actual', value as number)}
                              />
                          );
                        case 'stock_minimo':
                          return (
                              <EditableCell
                                value={item.stock_minimo}
                                type="number"
                                onSave={(value) => handleFieldUpdate(item._id, 'stock_minimo', value as number)}
                              />
                          );
                        case 'subcategoria':
                          return (
                              <EditableCell
                                value={item.subcategoria || ''}
                                type="text"
                                allowEmpty={true}
                                placeholder="Opcional"
                                onSave={(value) => handleFieldUpdate(item._id, 'subcategoria', value as string || undefined)}
                              />
                          );
                        case 'marca':
                          return (
                              <EditableCell
                                value={item.marca || ''}
                                type="text"
                                allowEmpty={true}
                                placeholder="Opcional"
                                onSave={(value) => handleFieldUpdate(item._id, 'marca', value as string || undefined)}
                              />
                          );
                        case 'package_size':
                          return (
                              <EditableCell
                                value={item.package_size || ''}
                                type="text"
                                allowEmpty={true}
                                placeholder="Opcional"
                                onSave={(value) => handleFieldUpdate(item._id, 'package_size', value as string || undefined)}
                              />
                          );
                        case 'location':
                          return (
                              <EditableCell
                                value={item.location}
                                type="text"
                                required={true}
                                onSave={(value) => handleFieldUpdate(item._id, 'location', value as string)}
                              />
                          );
                        case 'extra_notes':
                          return (
                              <EditableCell
                                value={item.extra_notes || ''}
                                type="textarea"
                                allowEmpty={true}
                                placeholder="Notas adicionales (opcional)"
                                onSave={(value) => handleFieldUpdate(item._id, 'extra_notes', value as string || undefined)}
                              />
                          );
                        case 'status':
                          return (
                              <StatusCell status={item.status} />
                          );
                        case 'active':
                          return (
                              <EditableCell
                                value={item.active}
                                type="toggle"
                                onSave={(value) => handleFieldUpdate(item._id, 'active', value as boolean)}
                              />
                          );
                        case 'acciones':
                          return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onItemClick(item);
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
                                {String((item as any)[column.key] || '')}
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
