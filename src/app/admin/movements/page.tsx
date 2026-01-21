'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { ItemAutocomplete } from '@/components/ui/ItemAutocomplete';
import { Id } from 'convex/_generated/dataModel';
import { StockMovement } from '@/types';

type MovementTypeFilter = 'all' | 'ingreso' | 'egreso';

export default function MovementsPage() {
  const movements = useQuery(api.stockMovements.getRecentStockMovements, {
    limit: 100,
  });

  const [typeFilter, setTypeFilter] = useState<MovementTypeFilter>('all');
  const [selectedItemId, setSelectedItemId] = useState<Id<'items'> | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('7'); // '7', '30', 'all'

  // Filter movements
  const filteredMovements = useMemo(() => {
    if (!movements) return [];

    let filtered = movements;

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((m) => m.type === typeFilter);
    }

    // Filter by item
    if (selectedItemId) {
      filtered = filtered.filter((m) => m.itemId === selectedItemId);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const days = parseInt(dateFilter);
      const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((m) => m.createdAt >= cutoffDate);
    }

    return filtered;
  }, [movements, typeFilter, selectedItemId, dateFilter]);

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

  // Loading state
  if (movements === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="text-center py-12 text-gray-500">
            <p>Cargando movimientos...</p>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div></div>
            <Link href="/admin/movements/new">
              <Button variant="primary" className="h-12">
                Registrar Ingreso
              </Button>
            </Link>
          </div>
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
                <option value="ingreso">Ingresos</option>
                <option value="egreso">Egresos</option>
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

            {/* Item Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Producto
              </label>
              <ItemAutocomplete
                value={selectedItemId}
                onChange={(itemId) => setSelectedItemId(itemId)}
                placeholder="Filtrar por producto..."
              />
            </div>
          </div>

          {/* Clear Filters */}
          {(typeFilter !== 'all' || selectedItemId || dateFilter !== 'all') && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setTypeFilter('all');
                  setSelectedItemId(null);
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
                  Motivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Referencia
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
                  const isIngreso = movement.type === 'ingreso';
                  return (
                    <tr
                      key={movement._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(movement.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {movement.item ? (
                          <Link
                            href={`/admin/inventario/${movement.itemId}`}
                            className="text-emerald-600 hover:text-emerald-800 font-medium"
                          >
                            {movement.item.nombre}
                          </Link>
                        ) : (
                          <span className="text-gray-500">Producto eliminado</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isIngreso
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isIngreso ? 'Ingreso' : 'Egreso'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`font-medium ${
                            isIngreso ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {isIngreso ? '+' : '-'}
                          {movement.cantidad}
                        </span>
                        {movement.item && (
                          <span className="text-gray-500 ml-1">
                            {movement.item.unidad}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {movement.motivo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {movement.referencia || '-'}
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
              const isIngreso = movement.type === 'ingreso';
              return (
                <div
                  key={movement._id}
                  className={`bg-white rounded-md shadow-sm border ${
                    isIngreso
                      ? 'border-emerald-200 border-l-4 border-l-emerald-500'
                      : 'border-red-200 border-l-4 border-l-red-500'
                  } p-4`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {movement.item ? (
                          <Link
                            href={`/admin/inventario/${movement.itemId}`}
                            className="text-emerald-600 hover:text-emerald-800"
                          >
                            {movement.item.nombre}
                          </Link>
                        ) : (
                          <span className="text-gray-500">Producto eliminado</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatShortDate(movement.createdAt)}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isIngreso
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isIngreso ? 'Ingreso' : 'Egreso'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Motivo: <span className="capitalize">{movement.motivo}</span>
                      </p>
                      {movement.referencia && (
                        <p className="text-xs text-gray-600">{movement.referencia}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          isIngreso ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {isIngreso ? '+' : '-'}
                        {movement.cantidad}
                      </p>
                      {movement.item && (
                        <p className="text-xs text-gray-500">{movement.item.unidad}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PageContainer>
    </div>
  );
}
