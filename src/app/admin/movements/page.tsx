'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/Button';
import { ItemAutocomplete } from '@/components/ui/ItemAutocomplete';
import { Id } from 'convex/_generated/dataModel';
import { MovementType, Movement } from '@/types';

type MovementTypeFilter = 'all' | MovementType;

// Component to display a group of movements
function MovementGroup({
  group,
  getMovementInfo,
  formatDate,
}: {
  group: {
    orderId: Id<'orders'> | null;
    supplierOrderId: Id<'supplier_orders'> | null;
    timestamp: number;
    area: string;
    movements: Movement[];
  };
  getMovementInfo: (type: MovementType) => { label: string; bgColor: string; textColor: string; borderColor: string };
  formatDate: (timestamp: number) => string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 overflow-hidden">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-gray-900">
            {group.supplierOrderId ? 'Pedido Abastecimiento' : `Pedido ${group.area}`}
            {group.supplierOrderId && <span className="ml-2 text-gray-500 font-normal">({group.area})</span>}
          </div>
          <div className="text-xs text-gray-500">
            {formatDate(group.timestamp)}
          </div>
          <div className="text-xs">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {group.movements.length} movimiento{group.movements.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Movements List */}
      {isExpanded && (
        <div className="divide-y divide-gray-200">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Origen → Destino
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {group.movements.map((movement) => {
                  const info = getMovementInfo(movement.type);
                  const isPositive = movement.type === 'COMPRA' ||
                    (movement.type === 'AJUSTE' && movement.nextStock > movement.prevStock);
                  return (
                    <tr
                      key={movement._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {movement.product ? (
                          <Link
                            href={`/admin/inventario/${movement.productId}`}
                            className="text-emerald-600 hover:text-emerald-800 font-medium"
                          >
                            {movement.product.name}
                          </Link>
                        ) : (
                          <span className="text-gray-500">Producto eliminado</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${info.bgColor} ${info.textColor}`}
                        >
                          {info.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <span
                          className={`font-medium ${isPositive ? 'text-emerald-700' : 'text-red-700'
                            }`}
                        >
                          {isPositive ? '+' : '-'}
                          {movement.quantity}
                        </span>
                        {movement.product && (
                          <span className="text-gray-500 ml-1">
                            {movement.product.baseUnit}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {movement.from ? `${movement.from} → ${movement.to}` : movement.to}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {group.movements.map((movement) => {
              const info = getMovementInfo(movement.type);
              const isPositive = movement.type === 'COMPRA' ||
                (movement.type === 'AJUSTE' && movement.nextStock > movement.prevStock);
              return (
                <div
                  key={movement._id}
                  className={`bg-white border-l-4 ${info.borderColor} p-3`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {movement.product ? (
                          <Link
                            href={`/admin/inventario/${movement.productId}`}
                            className="text-emerald-600 hover:text-emerald-800"
                          >
                            {movement.product.name}
                          </Link>
                        ) : (
                          <span className="text-gray-500">Producto eliminado</span>
                        )}
                      </p>
                    </div>
                    <div className="ml-3 text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${info.bgColor} ${info.textColor}`}
                      >
                        {info.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {movement.from ? `${movement.from} → ${movement.to}` : movement.to}
                    </p>
                    <div className="text-right flex items-baseline gap-1">
                      <p
                        className={`text-base font-bold ${isPositive ? 'text-emerald-700' : 'text-red-700'
                          }`}
                      >
                        {isPositive ? '+' : '-'}
                        {movement.quantity}
                      </p>
                      {movement.product && (
                        <span className="text-xs text-gray-500">{movement.product.baseUnit}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MovementsPage() {
  const [groupByOrder, setGroupByOrder] = useState(true);

  const movements = useQuery(api.movements.list, {
    limit: 100,
  });

  const groupedData = useQuery(api.movements.listGroupedByOrder, {
    limit: 100,
  });

  const [typeFilter, setTypeFilter] = useState<MovementTypeFilter>('all');
  const [selectedProductId, setSelectedProductId] = useState<Id<'products'> | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('7'); // '7', '30', 'all'

  // Filter movements (for flat view)
  const filteredMovements = useMemo(() => {
    if (!movements) return [];

    let filtered = movements;

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((m) => m.type === typeFilter);
    }

    // Filter by product
    if (selectedProductId) {
      filtered = filtered.filter((m) => m.productId === selectedProductId);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const days = parseInt(dateFilter);
      const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((m) => m.timestamp >= cutoffDate);
    }

    return filtered;
  }, [movements, typeFilter, selectedProductId, dateFilter]);

  // Filter grouped data
  const filteredGroupedData = useMemo(() => {
    if (!groupedData) return { groups: [], otherMovements: [] };

    let filteredGroups = groupedData.groups.map(group => ({
      ...group,
      movements: group.movements.filter((m) => {
        // Filter by type
        if (typeFilter !== 'all' && m.type !== typeFilter) return false;
        // Filter by product
        if (selectedProductId && m.productId !== selectedProductId) return false;
        // Filter by date
        if (dateFilter !== 'all') {
          const days = parseInt(dateFilter);
          const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;
          if (m.timestamp < cutoffDate) return false;
        }
        return true;
      })
    })).filter(group => group.movements.length > 0);

    let filteredOther = groupedData.otherMovements.filter((m) => {
      // Filter by type
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      // Filter by product
      if (selectedProductId && m.productId !== selectedProductId) return false;
      // Filter by date
      if (dateFilter !== 'all') {
        const days = parseInt(dateFilter);
        const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;
        if (m.timestamp < cutoffDate) return false;
      }
      return true;
    });

    return { groups: filteredGroups, otherMovements: filteredOther };
  }, [groupedData, typeFilter, selectedProductId, dateFilter]);

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  const formatShortDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  // Get movement display info
  const getMovementInfo = (type: MovementType) => {
    switch (type) {
      case 'COMPRA':
        return { label: 'Compra', isPositive: true, bgColor: 'bg-emerald-100', textColor: 'text-emerald-800', borderColor: 'border-l-emerald-500' };
      case 'TRASLADO':
        return { label: 'Traslado', isPositive: false, bgColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-l-blue-500' };
      case 'CONSUMO':
        return { label: 'Consumo', isPositive: false, bgColor: 'bg-red-100', textColor: 'text-red-800', borderColor: 'border-l-red-500' };
      case 'AJUSTE':
        return { label: 'Ajuste', isPositive: true, bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', borderColor: 'border-l-yellow-500' };
      default:
        return { label: type, isPositive: false, bgColor: 'bg-gray-100', textColor: 'text-gray-800', borderColor: 'border-l-gray-500' };
    }
  };

  // Render movement row (for flat view)
  const renderMovementRow = (movement: Movement) => {
    const info = getMovementInfo(movement.type);
    const isPositive = movement.type === 'COMPRA' ||
      (movement.type === 'AJUSTE' && movement.nextStock > movement.prevStock);
    return (
      <tr
        key={movement._id}
        className="hover:bg-gray-50 transition-colors"
      >
        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
          {formatDate(movement.timestamp)}
        </td>
        <td className="px-4 py-2 whitespace-nowrap text-sm">
          {movement.product ? (
            <Link
              href={`/admin/inventario/${movement.productId}`}
              className="text-emerald-600 hover:text-emerald-800 font-medium"
            >
              {movement.product.name}
            </Link>
          ) : (
            <span className="text-gray-500">Producto eliminado</span>
          )}
        </td>
        <td className="px-4 py-2 whitespace-nowrap text-sm">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${info.bgColor} ${info.textColor}`}
          >
            {info.label}
          </span>
        </td>
        <td className="px-4 py-2 whitespace-nowrap text-sm">
          <span
            className={`font-medium ${isPositive ? 'text-emerald-700' : 'text-red-700'
              }`}
          >
            {isPositive ? '+' : '-'}
            {movement.quantity}
          </span>
          {movement.product && (
            <span className="text-gray-500 ml-1">
              {movement.product.baseUnit}
            </span>
          )}
        </td>
        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
          {movement.from ? `${movement.from} → ${movement.to}` : movement.to}
        </td>
      </tr>
    );
  };

  // Render movement card (for flat view mobile)
  const renderMovementCard = (movement: Movement) => {
    const info = getMovementInfo(movement.type);
    const isPositive = movement.type === 'COMPRA' ||
      (movement.type === 'AJUSTE' && movement.nextStock > movement.prevStock);
    return (
      <div
        key={movement._id}
        className={`bg-white rounded-md shadow-sm border border-l-4 ${info.borderColor} p-3`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {movement.product ? (
                <Link
                  href={`/admin/inventario/${movement.productId}`}
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  {movement.product.name}
                </Link>
              ) : (
                <span className="text-gray-500">Producto eliminado</span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatShortDate(movement.timestamp)}
            </p>
          </div>
          <div className="ml-3 text-right">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${info.bgColor} ${info.textColor}`}
            >
              {info.label}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {movement.from ? `${movement.from} → ${movement.to}` : movement.to}
          </p>
          <div className="text-right flex items-baseline gap-1">
            <p
              className={`text-base font-bold ${isPositive ? 'text-emerald-700' : 'text-red-700'
                }`}
            >
              {isPositive ? '+' : '-'}
              {movement.quantity}
            </p>
            {movement.product && (
              <span className="text-xs text-gray-500">{movement.product.baseUnit}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (movements === undefined || (groupByOrder && groupedData === undefined)) {
    return (
      <PageContainer>
        <AdminHeader
          title="Movimientos"
          subtitle="Historial de movimientos de stock"
        />
        <div className="text-center py-12 text-gray-500">
          <p>Cargando movimientos...</p>
        </div>
      </PageContainer>
    );
  }

  const totalMovements = groupByOrder
    ? filteredGroupedData.groups.reduce((sum, g) => sum + g.movements.length, 0) + filteredGroupedData.otherMovements.length
    : filteredMovements.length;

  return (
    <PageContainer>
      <AdminHeader
        title="Movimientos"
        subtitle="Historial de movimientos de stock"
      />

      {/* Actions */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Link href="/admin/movements/new">
          <Button variant="primary" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Registrar Ingreso <span className="hidden sm:inline">(Sin pedido)</span>
          </Button>
        </Link>
        <Link href="/admin/movements/new-entrega">
          <Button variant="primary" className="flex items-center gap-2 bg-red-600 hover:bg-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            Registrar Entrega <span className="hidden sm:inline">(Sin solicitud)</span>
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as MovementTypeFilter)}
              className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todos</option>
              <option value="COMPRA">Compras</option>
              <option value="CONSUMO">Consumos</option>
              <option value="TRASLADO">Traslados</option>
              <option value="AJUSTE">Ajustes</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="all">Todos</option>
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Producto
            </label>
            <ItemAutocomplete
              value={selectedProductId}
              onChange={(productId) => setSelectedProductId(productId)}
              placeholder="Filtrar por producto..."
            />
          </div>
        </div>

        {/* Group By Order Toggle */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={groupByOrder}
                onChange={(e) => setGroupByOrder(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Agrupar por pedidos
              </span>
            </label>
          </div>

          {/* Clear Filters */}
          {(typeFilter !== 'all' || selectedProductId || dateFilter !== 'all') && (
            <button
              onClick={() => {
                setTypeFilter('all');
                setSelectedProductId(null);
                setDateFilter('7');
              }}
              className="text-sm text-emerald-600 hover:text-emerald-800"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-gray-500">
          Mostrando {totalMovements} movimiento{totalMovements !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Grouped View */}
      {groupByOrder && filteredGroupedData && (
        <div>
          {/* Order Groups */}
          {filteredGroupedData.groups.map((group) => (
            <MovementGroup
              key={group.orderId || group.supplierOrderId}
              group={group}
              getMovementInfo={getMovementInfo}
              formatDate={formatDate}
            />
          ))}

          {/* Other Movements (without order) */}
          {filteredGroupedData.otherMovements.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">
                  Otros movimientos ({filteredGroupedData.otherMovements.length})
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Movimientos no relacionados con pedidos
                </p>
              </div>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Origen → Destino
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredGroupedData.otherMovements.map(renderMovementRow)}
                  </tbody>
                </table>
              </div>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-2 p-3">
                {filteredGroupedData.otherMovements.map(renderMovementCard)}
              </div>
            </div>
          )}

          {filteredGroupedData.groups.length === 0 && filteredGroupedData.otherMovements.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">
                No hay movimientos que coincidan con los filtros
              </p>
            </div>
          )}
        </div>
      )}

      {/* Flat View */}
      {!groupByOrder && (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Origen → Destino
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      No hay movimientos que coincidan con los filtros
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map(renderMovementRow)
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {filteredMovements.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-500">
                  No hay movimientos que coincidan con los filtros
                </p>
              </div>
            ) : (
              filteredMovements.map(renderMovementCard)
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}
