'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

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
  if (pendingOrders === undefined) {
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
        
        {pendingOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No hay pedidos pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <div
                key={order._id}
                className="bg-white rounded-md shadow-sm border-l-4 border-l-amber-500 border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
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
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="primary"
                      onClick={() => handleQuickDeliver(order._id)}
                      disabled={deliveringId === order._id}
                    >
                      {deliveringId === order._id ? 'Entregando...' : 'Entregar'}
                    </Button>
                    <Link
                      href={`/admin/pedidos/${order._id}`}
                      className="text-sm text-emerald-600 hover:text-emerald-900"
                    >
                      Ver detalle
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
