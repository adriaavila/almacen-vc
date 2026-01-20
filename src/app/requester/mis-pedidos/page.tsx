'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Area } from '@/types';

export default function MyOrdersPage() {
  const allOrders = useQuery(api.orders.list);
  const ordersCocina = useQuery(api.orders.getByArea, { area: 'Cocina' });
  const ordersCafetin = useQuery(api.orders.getByArea, { area: 'Cafetín' });
  const ordersLimpieza = useQuery(api.orders.getByArea, { area: 'Limpieza' });
  
  const [selectedArea, setSelectedArea] = useState<Area | 'all'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<Id<"orders"> | null>(null);
  
  // Get filtered orders based on selected area
  const filteredOrders = selectedArea === 'all'
    ? allOrders
    : selectedArea === 'Cocina'
    ? ordersCocina
    : selectedArea === 'Cafetín'
    ? ordersCafetin
    : ordersLimpieza;

  // Get order with items for expanded order
  const expandedOrder = useQuery(
    api.orders.getById,
    expandedOrderId ? { id: expandedOrderId } : "skip"
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

  // Loading state
  if (filteredOrders === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="text-center py-12 text-gray-500">
            <p>Cargando pedidos...</p>
          </div>
        </PageContainer>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Mis Pedidos</h1>
        
        <div className="mb-6">
          <label htmlFor="area-filter" className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por área:
          </label>
          <select
            id="area-filter"
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value as Area | 'all')}
            className="block w-full max-w-xs h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="all">Todas las áreas</option>
            <option value="Cocina">Cocina</option>
            <option value="Cafetín">Cafetín</option>
            <option value="Limpieza">Limpieza</option>
          </select>
        </div>
        
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No hay pedidos registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders
              .sort((a, b) => b.createdAt - a.createdAt) // Sort by timestamp (most recent first)
              .map((order) => {
                const borderColor = order.status === 'pendiente' ? 'border-l-amber-500' : 'border-l-emerald-500';
                const isExpanded = expandedOrderId === order._id;
                const items = isExpanded && expandedOrder ? expandedOrder.items || [] : [];
                
                return (
                  <div
                    key={order._id}
                    className={`bg-white rounded-md shadow-sm border-l-4 ${borderColor} border border-gray-200 overflow-hidden transition-colors`}
                  >
                    <div
                      className="p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedOrderId(isExpanded ? null : order._id)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="mb-1">
                            <span className="text-lg font-semibold text-gray-900">{order.area}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm text-gray-500">{formatDate(order.createdAt)}</span>
                            <Badge variant={order.status}>
                              {order.status === 'pendiente' ? 'Pendiente' : 'Entregado'}
                            </Badge>
                            {isExpanded && expandedOrder && items.length > 0 && (
                              <span className="text-xs text-gray-400">
                                {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && expandedOrder && items.length > 0 && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Ítems del pedido:</h3>
                        <div className="space-y-2">
                          {items.map((item: any) => (
                            <div
                              key={item._id}
                              className="bg-white rounded-md border border-gray-200 p-3"
                            >
                              <div className="mb-1">
                                <span className="text-base font-semibold text-gray-900">{item.nombre}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500">{item.categoria}</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {item.cantidad} {item.unidad}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
