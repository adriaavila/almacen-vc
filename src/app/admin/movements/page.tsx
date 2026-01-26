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
import { MovementType } from '@/types';

type MovementTypeFilter = 'all' | MovementType;

export default function MovementsPage() {
  const movements = useQuery(api.movements.list, {
    limit: 100,
  });

  const [typeFilter, setTypeFilter] = useState<MovementTypeFilter>('all');
  const [selectedProductId, setSelectedProductId] = useState<Id<'products'> | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('7'); // '7', '30', 'all'

  // Filter movements
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

  // Loading state
  if (movements === undefined) {
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

  return (
    <PageContainer>
      <AdminHeader 
        title="Movimientos"
        subtitle="Historial de movimientos de stock"
      />

      {/* Registrar Ingreso Button */}
      <div className="mb-6 flex justify-center">
        <Link href="/admin/movements/new">
          <Button variant="primary" className="h-12">
            Registrar Ingreso
          </Button>
        </Link>
      </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Clear Filters */}
          {(typeFilter !== 'all' || selectedProductId || dateFilter !== 'all') && (
            <div className="mt-4">
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
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            Mostrando {filteredMovements.length} movimiento{filteredMovements.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origen → Destino
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No hay movimientos que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                filteredMovements.map((movement) => {
                  const info = getMovementInfo(movement.type);
                  const isPositive = movement.type === 'COMPRA' || 
                    (movement.type === 'AJUSTE' && movement.nextStock > movement.prevStock);
                  return (
                    <tr
                      key={movement._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(movement.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${info.bgColor} ${info.textColor}`}
                        >
                          {info.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`font-medium ${
                            isPositive ? 'text-emerald-700' : 'text-red-700'
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {movement.from ? `${movement.from} → ${movement.to}` : movement.to}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {movement.user}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filteredMovements.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">
                No hay movimientos que coincidan con los filtros
              </p>
            </div>
          ) : (
            filteredMovements.map((movement) => {
              const info = getMovementInfo(movement.type);
              const isPositive = movement.type === 'COMPRA' || 
                (movement.type === 'AJUSTE' && movement.nextStock > movement.prevStock);
              return (
                <div
                  key={movement._id}
                  className={`bg-white rounded-md shadow-sm border border-l-4 ${info.borderColor} p-4`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 mb-1">
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
                      <p className="text-xs text-gray-500">
                        {formatShortDate(movement.timestamp)}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${info.bgColor} ${info.textColor}`}
                      >
                        {info.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        {movement.from ? `${movement.from} → ${movement.to}` : movement.to}
                      </p>
                      <p className="text-xs text-gray-600">{movement.user}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          isPositive ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {isPositive ? '+' : '-'}
                        {movement.quantity}
                      </p>
                      {movement.product && (
                        <p className="text-xs text-gray-500">{movement.product.baseUnit}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
    </PageContainer>
  );
}
