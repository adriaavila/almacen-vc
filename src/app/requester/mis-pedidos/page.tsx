'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { RequesterHeader } from '@/components/requester/RequesterHeader';
import { Badge } from '@/components/ui/Badge';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Toast } from '@/components/ui/Toast';
import { OrderListSkeleton } from '@/components/ui/SkeletonLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { getUserArea } from '@/lib/auth';
import { pluralizeUnit } from '@/lib/utils';
import { Area } from '@/types';

export default function MyOrdersPage() {
  const [userArea, setUserAreaState] = useState<Area | null>(null);
  const ordersCocina = useQuery(api.orders.getByArea, { area: 'Cocina' });
  const ordersCafetin = useQuery(api.orders.getByArea, { area: 'Cafetin' });
  const ordersLimpieza = useQuery(api.orders.getByArea, { area: 'Limpieza' });
  
  const [expandedOrderId, setExpandedOrderId] = useState<Id<"orders"> | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<Id<"orders"> | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Id<"orders"> | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
  }>({
    message: '',
    type: 'info',
    isOpen: false,
  });
  
  const deleteOrder = useMutation(api.orders.remove);
  
  // Sync user area from localStorage (client-only). Initialize on mount to avoid SSR/client mismatch.
  useEffect(() => {
    setUserAreaState(getUserArea());

    const handleAreaChange = () => {
      setUserAreaState(getUserArea());
    };

    window.addEventListener('userAreaChange', handleAreaChange);
    window.addEventListener('storage', handleAreaChange);

    return () => {
      window.removeEventListener('userAreaChange', handleAreaChange);
      window.removeEventListener('storage', handleAreaChange);
    };
  }, []);
  
  // Get filtered orders based on user's area
  const filteredOrders = userArea === 'Cocina'
    ? (ordersCocina ?? [])
    : userArea === 'Cafetin'
    ? (ordersCafetin ?? [])
    : userArea === 'Limpieza'
    ? (ordersLimpieza ?? [])
    : []; // Empty array if no area is set

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

  const handleDeleteClick = (orderId: Id<"orders">) => {
    setOrderToDelete(orderId);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    try {
      setDeletingOrderId(orderToDelete);
      await deleteOrder({ id: orderToDelete });
      // Close expanded order if it was the one being deleted
      if (expandedOrderId === orderToDelete) {
        setExpandedOrderId(null);
      }
      setToast({
        message: 'Pedido eliminado correctamente',
        type: 'success',
        isOpen: true,
      });
      setOrderToDelete(null);
    } catch (error) {
      console.error('Error al eliminar pedido:', error);
      setToast({
        message: 'No se pudo eliminar el pedido. Intente de nuevo.',
        type: 'error',
        isOpen: true,
      });
    } finally {
      setDeletingOrderId(null);
    }
  };

  // Check all three queries individually to properly detect loading state
  const isLoading = ordersCocina === undefined || ordersCafetin === undefined || ordersLimpieza === undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer>
        <RequesterHeader 
          title="Mis Pedidos"
          subtitle={userArea ? `Mostrando pedidos del área: ${userArea}` : undefined}
        />

        {isLoading ? (
          <OrderListSkeleton count={5} />
        ) : (
          <>
        
        {!userArea && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 text-sm">
              Por favor, selecciona tu área desde la página principal para ver tus pedidos.
            </p>
          </div>
        )}
        
        {filteredOrders.length === 0 ? (
          <EmptyState
            title={userArea ? 'No hay pedidos registrados' : 'Selecciona un área'}
            message={userArea ? 'No hay pedidos registrados para tu área.' : 'Por favor, selecciona tu área desde la página principal para ver tus pedidos.'}
          />
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
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div
                          className="flex-1 min-w-0 hover:bg-gray-50 cursor-pointer p-2 -m-2 rounded"
                          onClick={() => setExpandedOrderId(isExpanded ? null : order._id)}
                        >
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
                        <div className="flex items-center gap-2">
                          {order.status === 'pendiente' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(order._id);
                              }}
                              disabled={deletingOrderId === order._id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Eliminar pedido"
                              aria-label="Eliminar pedido"
                            >
                              {deletingOrderId === order._id ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          )}
                          <div
                            className="cursor-pointer"
                            onClick={() => setExpandedOrderId(isExpanded ? null : order._id)}
                          >
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
                    </div>
                    
                    {isExpanded && expandedOrder && items.length > 0 && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-3 text-center">Ítems del pedido:</h3>
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
                                  {item.cantidad} {pluralizeUnit(item.unidad, item.cantidad)}
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
          </>
        )}
      </PageContainer>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={orderToDelete !== null}
        onClose={() => setOrderToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar pedido"
        message="¿Estás seguro de que deseas eliminar este pedido?"
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        isLoading={deletingOrderId !== null}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
}
