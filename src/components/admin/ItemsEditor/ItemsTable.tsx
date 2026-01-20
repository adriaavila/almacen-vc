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
  active: boolean;
};

interface ItemsTableProps {
  items: ConvexItem[];
  columns: ColumnConfig[];
  onItemClick: (item: ConvexItem) => void;
  onFieldUpdate: (itemId: Id<"items">, field: string, value: string | number | boolean | undefined) => Promise<void>;
  categories: string[];
  subcategories: string[];
}

export function ItemsTable({
  items,
  columns,
  onItemClick,
  onFieldUpdate,
  categories,
  subcategories,
}: ItemsTableProps) {
  // Sort columns by order
  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => a.order - b.order).filter(col => col.visible);
  }, [columns]);

  const handleFieldUpdate = async (itemId: Id<"items">, field: string, value: string | number | boolean | undefined) => {
    await onFieldUpdate(itemId, field, value);
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10 border-b">
            <TableRow>
              {sortedColumns.map((column) => {
                const isRequired = ['nombre', 'categoria', 'unidad', 'location'].includes(column.key);
                return (
                  <TableHead key={column.key} className="font-semibold text-gray-700">
                    {column.label}
                    {isRequired && <span className="text-red-500 ml-1">*</span>}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={sortedColumns.length} className="text-center py-8 text-gray-500">
                  No hay items para mostrar
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isLowStock = item.status === 'bajo_stock';
                return (
                  <TableRow
                    key={item._id}
                    onClick={() => onItemClick(item)}
                    className={`cursor-pointer hover:bg-gray-50 ${
                      isLowStock ? 'border-l-4 border-l-red-500' : ''
                    }`}
                  >
                    {sortedColumns.map((column) => {
                      const cellKey = `${item._id}-${column.key}`;
                      
                      switch (column.key) {
                        case 'nombre':
                          return (
                            <TableCell key={cellKey}>
                              <EditableCell
                                value={item.nombre}
                                type="text"
                                required={true}
                                onSave={(value) => handleFieldUpdate(item._id, 'nombre', value as string)}
                              />
                            </TableCell>
                          );
                        case 'categoria':
                          return (
                            <TableCell key={cellKey}>
                              <EditableCell
                                value={item.categoria}
                                type="select"
                                options={categories}
                                required={true}
                                onSave={(value) => handleFieldUpdate(item._id, 'categoria', value as string)}
                              />
                            </TableCell>
                          );
                        case 'unidad':
                          return (
                            <TableCell key={cellKey}>
                              <EditableCell
                                value={item.unidad}
                                type="text"
                                required={true}
                                onSave={(value) => handleFieldUpdate(item._id, 'unidad', value as string)}
                              />
                            </TableCell>
                          );
                        case 'stock_actual':
                          return (
                            <TableCell key={cellKey}>
                              <EditableCell
                                value={item.stock_actual}
                                type="number"
                                onSave={(value) => handleFieldUpdate(item._id, 'stock_actual', value as number)}
                              />
                            </TableCell>
                          );
                        case 'stock_minimo':
                          return (
                            <TableCell key={cellKey}>
                              <EditableCell
                                value={item.stock_minimo}
                                type="number"
                                onSave={(value) => handleFieldUpdate(item._id, 'stock_minimo', value as number)}
                              />
                            </TableCell>
                          );
                        case 'subcategoria':
                          return (
                            <TableCell key={cellKey}>
                              <EditableCell
                                value={item.subcategoria || ''}
                                type="text"
                                allowEmpty={true}
                                placeholder="Opcional"
                                onSave={(value) => handleFieldUpdate(item._id, 'subcategoria', value as string || undefined)}
                              />
                            </TableCell>
                          );
                        case 'marca':
                          return (
                            <TableCell key={cellKey}>
                              <EditableCell
                                value={item.marca || ''}
                                type="text"
                                allowEmpty={true}
                                placeholder="Opcional"
                                onSave={(value) => handleFieldUpdate(item._id, 'marca', value as string || undefined)}
                              />
                            </TableCell>
                          );
                        case 'package_size':
                          return (
                            <TableCell key={cellKey}>
                              <EditableCell
                                value={item.package_size || ''}
                                type="text"
                                allowEmpty={true}
                                placeholder="Opcional"
                                onSave={(value) => handleFieldUpdate(item._id, 'package_size', value as string || undefined)}
                              />
                            </TableCell>
                          );
                        case 'location':
                          return (
                            <TableCell key={cellKey}>
                              <EditableCell
                                value={item.location}
                                type="text"
                                required={true}
                                onSave={(value) => handleFieldUpdate(item._id, 'location', value as string)}
                              />
                            </TableCell>
                          );
                        case 'extra_notes':
                          return (
                            <TableCell key={cellKey}>
                              <EditableCell
                                value={item.extra_notes || ''}
                                type="textarea"
                                allowEmpty={true}
                                placeholder="Notas adicionales (opcional)"
                                onSave={(value) => handleFieldUpdate(item._id, 'extra_notes', value as string || undefined)}
                              />
                            </TableCell>
                          );
                        case 'status':
                          return (
                            <TableCell key={cellKey}>
                              <StatusCell status={item.status} />
                            </TableCell>
                          );
                        case 'active':
                          return (
                            <TableCell key={cellKey}>
                              <EditableCell
                                value={item.active}
                                type="toggle"
                                onSave={(value) => handleFieldUpdate(item._id, 'active', value as boolean)}
                              />
                            </TableCell>
                          );
                        case 'acciones':
                          return (
                            <TableCell key={cellKey}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onItemClick(item);
                                }}
                                className="text-emerald-600 hover:text-emerald-800 p-1"
                                title="Editar completo"
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
                            </TableCell>
                          );
                        default:
                          return (
                            <TableCell key={cellKey}>
                              {String((item as any)[column.key] || '')}
                            </TableCell>
                          );
                      }
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
