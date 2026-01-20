'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StockMovement } from '@/types';

export default function ItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = params?.id as Id<'items'>;

  const item = useQuery(api.items.getById, itemId ? { id: itemId } : 'skip');
  const movements = useQuery(
    api.stockMovements.getMovementsByItem,
    itemId ? { itemId } : 'skip'
  );

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
  if (item === undefined || movements === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Cargando...</p>
          </div>
        </PageContainer>
      </div>
    );
  }

  // Error state - item not found
  if (item === null) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <p className="text-red-600 mb-4">Producto no encontrado</p>
            <Button
              variant="secondary"
              onClick={() => router.push('/admin/inventario')}
            >
              Volver a inventario
            </Button>
          </div>
        </PageContainer>
      </div>
    );
  }

  const isLowStock = item.status === 'bajo_stock';
  const recentMovements = (movements || []).slice(0, 20); // Last 20 movements

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={() => router.push('/admin/inventario')}
            className="mb-4"
          >
            ← Volver a inventario
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {item.nombre}
          </h1>
        </div>

        {/* Header with Stock */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`h-3 w-3 rounded-full ${
                    isLowStock ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                ></div>
                <Badge variant={isLowStock ? 'bajo-minimo' : 'ok'}>
                  {isLowStock ? 'Bajo Stock' : 'OK'}
                </Badge>
              </div>
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-500 mb-1">
                  Stock Actual
                </p>
                <p
                  className={`text-5xl font-bold ${
                    isLowStock ? 'text-red-600' : 'text-gray-900'
                  }`}
                >
                  {item.stock_actual}
                </p>
                <p className="text-lg text-gray-500 mt-1">
                  {item.unidad}
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => router.push('/admin/movements/new')}
              className="h-12"
            >
              Registrar Ingreso
            </Button>
          </div>

          {/* Item Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Categoría</p>
              <p className="text-base text-gray-900">
                {item.categoria}
                {item.subcategoria && ` • ${item.subcategoria}`}
              </p>
            </div>
            {item.marca && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Marca</p>
                <p className="text-base text-gray-900">{item.marca}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Stock Mínimo</p>
              <p className="text-base text-gray-900">
                {item.stock_minimo} {item.unidad}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Ubicación</p>
              <p className="text-base text-gray-900">{item.location}</p>
            </div>
            {item.package_size && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Tamaño de Paquete</p>
                <p className="text-base text-gray-900">{item.package_size}</p>
              </div>
            )}
            {item.extra_notes && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Notas</p>
                <p className="text-base text-gray-900">{item.extra_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Últimos Movimientos
            </h2>
            {movements && movements.length > 20 && (
              <p className="text-sm text-gray-500">
                Mostrando 20 de {movements.length}
              </p>
            )}
          </div>

          {recentMovements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay movimientos registrados para este producto</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMovements.map((movement) => {
                const isIngreso = movement.type === 'ingreso';
                return (
                  <div
                    key={movement._id}
                    className={`flex items-center justify-between p-4 rounded-md border ${
                      isIngreso
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          isIngreso
                            ? 'bg-emerald-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {isIngreso ? (
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 12H4"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {isIngreso ? 'Ingreso' : 'Egreso'}
                          </p>
                          <span className="text-xs text-gray-500">
                            • {movement.motivo}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatShortDate(movement.createdAt)}
                        </p>
                        {movement.referencia && (
                          <p className="text-xs text-gray-600 mt-1">
                            {movement.referencia}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p
                        className={`text-lg font-bold ${
                          isIngreso ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {isIngreso ? '+' : '-'}
                        {movement.cantidad}
                      </p>
                      <p className="text-xs text-gray-500">{item.unidad}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
