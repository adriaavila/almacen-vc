'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OrderListSkeleton } from '@/components/ui/SkeletonLoader';
import { EmptyOrdersState } from '@/components/ui/EmptyState';

// Component for individual order card with expandable details
function OrderCard({ 
  order, 
  onDeliver, 
  deliveringId 
}: { 
  order: any; 
  onDeliver: (id: Id<"orders">) => void;
  deliveringId: Id<"orders"> | null;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const orderDetails = useQuery(
    api.orders.getById,
    isExpanded ? { id: order._id } : "skip"
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
  
  return (
    <div className="bg-white rounded-md shadow-sm border-l-4 border-l-amber-500 border border-gray-200 overflow-hidden">
      <div className="p-4 hover:bg-gray-50 transition-colors">
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
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => onDeliver(order._id)}
              disabled={deliveringId === order._id}
            >
              {deliveringId === order._id ? 'Entregando...' : 'Entregar'}
            </Button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-emerald-600 hover:text-emerald-900 font-medium transition-colors"
            >
              {isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
            </button>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          {orderDetails === undefined ? (
            <div className="text-sm text-gray-500 py-2">Cargando detalles...</div>
          ) : orderDetails === null ? (
            <div className="text-sm text-red-600 py-2">Error al cargar detalles del pedido</div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 text-center">Ítems del Pedido</h3>
              {orderDetails.items && orderDetails.items.length > 0 ? (
                <div className="space-y-2">
                  {orderDetails.items.map((item: any) => (
                    <div
                      key={item._id}
                      className="bg-white rounded-md border border-gray-200 p-3"
                    >
                      <div className="mb-1">
                        <span className="text-base font-semibold text-gray-900">{item.nombre}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-gray-500">{item.categoria}</span>
                        <span className="text-sm font-medium text-gray-900">
                          {item.cantidad} {item.unidad}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-md border border-gray-200 p-3 text-center">
                  <p className="text-sm text-gray-500">No hay ítems en este pedido</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PendingOrdersPage() {
  const router = useRouter();
  const pendingOrders = useQuery(api.orders.getPending);
  const deliverOrder = useMutation(api.orders.deliver);
  const [deliveringId, setDeliveringId] = useState<Id<"orders"> | null>(null);
  
  const handleQuickDeliver = async (orderId: Id<"orders">) => {
    setDeliveringId(orderId);
    try {
      await deliverOrder({ id: orderId });
      setDeliveringId(null);
    } catch (error) {
      console.error('Error al entregar pedido:', error);
      setDeliveringId(null);
      // On error, navigate to detail page for better error handling
      router.push(`/admin/pedidos/${orderId}`);
    }
  };

  // Loading state
  if (pendingOrders === undefined) {
    return (
      <PageContainer>
        <AdminHeader 
          title="Pedidos"
          subtitle="Gestión de pedidos pendientes"
        />
        <OrderListSkeleton count={5} />
      </PageContainer>
    );
  }
  
  return (
    <PageContainer>
      <AdminHeader 
        title="Pedidos"
        subtitle="Gestión de pedidos pendientes"
      />
        
        {pendingOrders.length === 0 ? (
          <EmptyOrdersState message="No hay pedidos pendientes." />
        ) : (
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                onDeliver={handleQuickDeliver}
                deliveringId={deliveringId}
              />
            ))}
          </div>
        )}
    </PageContainer>
  );
}
