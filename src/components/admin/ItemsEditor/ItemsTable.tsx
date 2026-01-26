'use client';

import { useMemo, useState, useEffect } from 'react';
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
import { MobileItemCard } from './MobileItemCard';
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
  active: boolean;
  totalStock: number;
  stockAlmacen: number;
  stockCafetin: number;
  status: "ok" | "bajo_stock";
};

// Helper functions to render cells for different table types
function renderProductCell(
  column: ColumnConfig,
  product: ConvexProduct,
  handleFieldUpdate: (productId: Id<"products">, field: string, value: string | number | boolean | undefined) => Promise<void>,
  onItemClick: (item: any) => void,
  categories: string[],
  isLowStock: boolean,
  onDelete?: (productId: Id<"products">, productName: string) => void
) {
  switch (column.key) {
    case 'name':
      return (
        <div className="min-w-0 flex-1" title={product.name}>
          <EditableCell
            value={product.name}
            type="text"
            required={true}
            onSave={(value) => handleFieldUpdate(product._id, 'name', value as string)}
          />
        </div>
      );
    case 'category':
      return (
        <div className="min-w-0" title={product.category}>
          <EditableCell
            value={product.category}
            type="select"
            options={categories}
            required={true}
            onSave={(value) => handleFieldUpdate(product._id, 'category', value as string)}
          />
        </div>
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
    case 'purchaseUnit':
      return (
        <EditableCell
          value={product.purchaseUnit}
          type="text"
          required={true}
          onSave={(value) => handleFieldUpdate(product._id, 'purchaseUnit', value as string)}
        />
      );
    case 'conversionFactor':
      return (
        <EditableCell
          value={product.conversionFactor.toString()}
          type="number"
          required={true}
          onSave={(value) => handleFieldUpdate(product._id, 'conversionFactor', parseFloat(value as string) || 1)}
        />
      );
    case 'subCategory':
      return (
        <div className="min-w-0 truncate" title={product.subCategory || ''}>
          <EditableCell
            value={product.subCategory || ''}
            type="text"
            allowEmpty={true}
            placeholder="Opcional"
            onSave={(value) => handleFieldUpdate(product._id, 'subCategory', value as string || undefined)}
          />
        </div>
      );
    case 'brand':
      return (
        <div className="min-w-0 truncate" title={product.brand || ''}>
          <EditableCell
            value={product.brand || ''}
            type="text"
            allowEmpty={true}
            placeholder="Opcional"
            onSave={(value) => handleFieldUpdate(product._id, 'brand', value as string || undefined)}
          />
        </div>
      );
    case 'status':
      return <StatusCell status={product.status} />;
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
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onItemClick(product);
            }}
            className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer"
            title="Abrir editor completo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(product._id, product.name);
              }}
              className="text-red-600 hover:text-red-800 p-1.5 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
              title="Eliminar producto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      );
    default:
      return <span className="text-sm text-gray-600">{String((product as any)[column.key] || '')}</span>;
  }
}

function renderInventoryCell(column: ColumnConfig, item: any, onItemClick: (item: any) => void) {
  const isLowStock = item.stockActual <= item.stockMinimo;
  switch (column.key) {
    case 'productName':
      return <span className="font-medium text-gray-900 truncate block" title={item.product?.name || 'N/A'}>{item.product?.name || 'N/A'}</span>;
    case 'location':
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {item.location === 'almacen' ? 'Almacén' : item.location === 'cafetin' ? 'Cafetín' : item.location || 'N/A'}
        </span>
      );
    case 'stockActual':
      return <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>{item.stockActual ?? 0}</span>;
    case 'stockMinimo':
      return <span className="text-gray-700">{item.stockMinimo ?? 0}</span>;
    case 'status':
      return <StatusCell status={isLowStock ? 'bajo_stock' : 'ok'} />;
    case 'updatedAt':
      return (
        <span className="text-sm text-gray-600">
          {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('es-ES') : 'N/A'}
        </span>
      );
    case 'acciones':
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onItemClick(item);
          }}
          className="text-emerald-600 hover:text-emerald-800 p-1.5 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer"
          title="Editar inventario"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      );
    default:
      return <span className="text-sm text-gray-600">{String((item as any)[column.key] || '')}</span>;
  }
}

function renderMovementCell(column: ColumnConfig, item: any, onItemClick: (item: any) => void) {
  switch (column.key) {
    case 'productName':
      return <span className="font-medium text-gray-900 truncate block" title={item.product?.name || 'N/A'}>{item.product?.name || 'N/A'}</span>;
    case 'type':
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          item.type === 'COMPRA' ? 'bg-blue-100 text-blue-800' :
          item.type === 'TRASLADO' ? 'bg-purple-100 text-purple-800' :
          item.type === 'CONSUMO' ? 'bg-orange-100 text-orange-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {item.type}
        </span>
      );
    case 'from':
      return <span className="text-gray-700">{item.from || '-'}</span>;
    case 'to':
      return <span className="text-gray-700">{item.to || '-'}</span>;
    case 'quantity':
      return <span className="font-medium text-gray-900">{item.quantity}</span>;
    case 'prevStock':
      return <span className="text-gray-700">{item.prevStock}</span>;
    case 'nextStock':
      return <span className="text-gray-700">{item.nextStock}</span>;
    case 'user':
      return <span className="text-sm text-gray-600">{item.user || 'N/A'}</span>;
    case 'timestamp':
      return (
        <span className="text-sm text-gray-600">
          {new Date(item.timestamp).toLocaleString('es-ES')}
        </span>
      );
    default:
      return <span className="text-sm text-gray-600">{String((item as any)[column.key] || '')}</span>;
  }
}

interface ItemsTableProps {
  items: any[];
  columns: ColumnConfig[];
  onItemClick: (item: any) => void;
  onFieldUpdate: (productId: Id<"products">, field: string, value: string | number | boolean | undefined) => Promise<void>;
  onDelete?: (productId: Id<"products">, productName: string) => void;
  categories: string[];
  subcategories: string[];
  columnFilters: any;
  onColumnFilterChange: (columnKey: string, value: string | string[] | boolean[] | { min?: number; max?: number } | undefined) => void;
  columnFilterOptions: {
    marcas: string[];
    unidades: string[];
    purchaseUnits?: string[];
    locations: string[];
  };
  onClearAllColumnFilters: () => void;
  tableType?: 'products' | 'inventory' | 'movements';
}

export function ItemsTable({
  items,
  columns,
  onItemClick,
  onFieldUpdate,
  onDelete,
  categories,
  subcategories,
  columnFilters,
  onColumnFilterChange,
  columnFilterOptions,
  onClearAllColumnFilters,
  tableType = 'products',
}: ItemsTableProps) {
  // Responsive column visibility based on screen width
  const [screenWidth, setScreenWidth] = useState(1920);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const updateWidth = () => {
      const width = window.innerWidth;
      setScreenWidth(width);
      setIsMobile(width < 1024); // lg breakpoint
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Sort columns by order and filter by visibility
  const sortedColumns = useMemo(() => {
    const visible = [...columns].sort((a, b) => a.order - b.order).filter(col => col.visible);
    
    // Hide less critical columns on smaller screens
    if (screenWidth < 1440) {
      // Hide subCategory, brand, purchaseUnit, conversionFactor on medium screens
      return visible.filter(col => 
        !['subCategory', 'brand', 'purchaseUnit', 'conversionFactor'].includes(col.key) || 
        ['name', 'category', 'baseUnit', 'status', 'active', 'acciones'].includes(col.key)
      );
    }
    if (screenWidth < 1600) {
      // Hide conversionFactor on smaller screens
      return visible.filter(col => 
        !['conversionFactor'].includes(col.key) || 
        ['name', 'category', 'subCategory', 'brand', 'baseUnit', 'purchaseUnit', 'status', 'active', 'acciones'].includes(col.key)
      );
    }
    return visible;
  }, [columns, screenWidth]);

  const handleFieldUpdate = async (productId: Id<"products">, field: string, value: string | number | boolean | undefined) => {
    await onFieldUpdate(productId, field, value);
  };

  // Render mobile cards for mobile/tablet
  if (isMobile) {
    return (
      <div className="space-y-4 w-full pb-4">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="flex flex-col items-center gap-2">
              <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm font-medium">
                {tableType === 'products' && 'No hay productos para mostrar'}
                {tableType === 'inventory' && 'No hay registros de inventario para mostrar'}
                {tableType === 'movements' && 'No hay movimientos para mostrar'}
              </p>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <MobileItemCard
              key={item._id || item.productId || item.id}
              item={item}
              tableType={tableType}
              onItemClick={onItemClick}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    );
  }

  // Render desktop table
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm w-full max-w-full">
      <div className="overflow-y-auto overflow-x-auto max-h-[calc(100vh-250px)] w-full">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200 shadow-sm">
            <TableRow className="hover:bg-transparent">
              {sortedColumns.map((column) => {
                const isRequired = ['name', 'category', 'baseUnit', 'purchaseUnit', 'conversionFactor'].includes(column.key);
                // Define column width classes based on column type
                const getColumnWidthClass = (key: string) => {
                  switch (key) {
                    case 'name':
                      return 'min-w-[200px] max-w-[300px]';
                    case 'category':
                      return 'min-w-[120px] max-w-[180px]';
                    case 'subCategory':
                      return 'min-w-[120px] max-w-[180px]';
                    case 'brand':
                      return 'min-w-[100px] max-w-[150px]';
                    case 'baseUnit':
                    case 'purchaseUnit':
                      return 'min-w-[80px] max-w-[100px]';
                    case 'conversionFactor':
                      return 'min-w-[120px] max-w-[150px]';
                    case 'stockActual':
                    case 'stockMinimo':
                      return 'min-w-[100px] max-w-[120px]';
                    case 'status':
                    case 'active':
                      return 'min-w-[100px] max-w-[120px]';
                    case 'acciones':
                      return 'min-w-[80px] max-w-[100px]';
                    case 'location':
                      return 'min-w-[100px] max-w-[120px]';
                    case 'type':
                      return 'min-w-[100px] max-w-[120px]';
                    case 'quantity':
                    case 'prevStock':
                    case 'nextStock':
                      return 'min-w-[100px] max-w-[120px]';
                    case 'updatedAt':
                    case 'timestamp':
                      return 'min-w-[140px] max-w-[180px]';
                    case 'user':
                      return 'min-w-[100px] max-w-[150px]';
                    case 'from':
                    case 'to':
                      return 'min-w-[100px] max-w-[120px]';
                    default:
                      return 'min-w-[100px]';
                  }
                };
                return (
                  <TableHead 
                    key={column.key} 
                    className={`font-semibold text-gray-700 py-2 px-4 text-sm uppercase tracking-wider whitespace-nowrap ${getColumnWidthClass(column.key)}`}
                  >
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
                          case 'purchaseUnit':
                            return (
                              <ColumnHeaderFilter
                                columnKey="purchaseUnit"
                                filterType="dropdown"
                                options={columnFilterOptions.purchaseUnits || []}
                                value={columnFilters.purchaseUnit}
                                onChange={(value) => onColumnFilterChange('purchaseUnit', value as string[])}
                                placeholder="Filtrar unidad compra"
                              />
                            );
                          case 'conversionFactor':
                            return (
                              <ColumnHeaderFilter
                                columnKey="conversionFactor"
                                filterType="text"
                                value={columnFilters.conversionFactor}
                                onChange={(value) => onColumnFilterChange('conversionFactor', value as string)}
                                placeholder="Buscar factor..."
                              />
                            );
                          case 'status':
                            return (
                              <ColumnHeaderFilter
                                columnKey="status"
                                filterType="dropdown"
                                options={['OK', 'Bajo Stock']}
                                value={columnFilters.status?.map((s: 'ok' | 'bajo_stock') => s === 'ok' ? 'OK' : 'Bajo Stock')}
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
                                value={columnFilters.active?.map((a: boolean) => a ? 'Activo' : 'Inactivo')}
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
                    <p className="text-sm font-medium">
                      {tableType === 'products' && 'No hay productos para mostrar'}
                      {tableType === 'inventory' && 'No hay registros de inventario para mostrar'}
                      {tableType === 'movements' && 'No hay movimientos para mostrar'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isLowStock = tableType === 'products' 
                  ? item.status === 'bajo_stock'
                  : tableType === 'inventory'
                  ? item.stockActual <= item.stockMinimo
                  : false;
                const itemId = item._id || item.productId || item.id;
                return (
                  <TableRow
                    key={itemId}
                    className={`transition-all duration-150 hover:bg-emerald-50/50 ${
                      isLowStock ? 'border-l-4 border-l-red-500 bg-red-50/30' : 'border-l-4 border-l-emerald-500'
                    }`}
                  >
                    {sortedColumns.map((column) => {
                      const cellKey = `${itemId}-${column.key}`;
                      // Determine if cell should truncate based on column type
                      const shouldTruncate = !['name', 'category', 'status', 'active', 'acciones'].includes(column.key);
                      const getCellClassName = () => {
                        if (shouldTruncate) {
                          return 'py-3 px-4 max-w-[300px]';
                        }
                        return 'py-3 px-4';
                      };
                      
                      return (
                        <TableCell key={cellKey} className={getCellClassName()}>
                          <div className={`min-h-10 flex items-center ${shouldTruncate ? 'truncate' : ''}`}>
                            {(() => {
                              if (tableType === 'products') {
                                return renderProductCell(column, item, handleFieldUpdate, onItemClick, categories, isLowStock, onDelete);
                              } else if (tableType === 'inventory') {
                                return renderInventoryCell(column, item, onItemClick);
                              } else if (tableType === 'movements') {
                                return renderMovementCell(column, item, onItemClick);
                              }
                              return <span className="text-sm text-gray-600">{String((item as any)[column.key] || '')}</span>;
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
