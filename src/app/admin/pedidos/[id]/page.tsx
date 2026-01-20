'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/Badge';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as Id<"orders">;
  
  const order = useQuery(api.orders.getById, orderId ? { id: orderId } : "skip");
  const deliverOrder = useMutation(api.orders.deliver);
  
  const [isDelivering, setIsDelivering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryResult, setDeliveryResult] = useState<{
    deliveredItems: Array<{ itemId: string; cantidad: number; newStock: number }>;
    lowStockItems: Array<{ itemId: string; nombre: string; stock_actual: number; stock_minimo: number }>;
  } | null>(null);
  const [isDelivered, setIsDelivered] = useState(false);
  
  const handleDeliver = async () => {
    if (!orderId || !order) return;
    
    setIsDelivering(true);
    setError(null);
    
    try {
      const result = await deliverOrder({ id: orderId });
      setDeliveryResult(result);
      setIsDelivered(true);
      setIsDelivering(false);
    } catch (err) {
      setError('No se pudo entregar el pedido. Intente de nuevo.');
      setIsDelivering(false);
    }
  };
  
  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };
  
  // Loading state
  if (order === undefined) {
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

  // Error state - order not found
  if (order === null) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <p className="text-red-600">Pedido no encontrado</p>
            <Button
              variant="secondary"
              onClick={() => router.push('/admin/pedidos')}
              className="mt-4"
            >
              Volver a pedidos
            </Button>
          </div>
        </PageContainer>
      </div>
    );
  }

  // Check if already delivered
  if (order.status === 'entregado' && !isDelivered) {
    setIsDelivered(true);
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={() => router.push('/admin/pedidos')}
            className="mb-4"
          >
            ← Volver a pedidos
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Pedido – {order.area}</h1>
          <p className="text-sm text-gray-500 mt-1">¿Qué entrego ahora?</p>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
            {error}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Área</p>
              <p className="text-lg font-semibold text-gray-900">{order.area}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Fecha</p>
              <p className="text-lg font-semibold text-gray-900">{formatDate(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Estado</p>
              <Badge variant={order.status}>
                {order.status === 'pendiente' ? 'Pendiente' : 'Entregado'}
              </Badge>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ítems del Pedido</h2>
            {order.items && order.items.length > 0 ? (
              <div className="space-y-2">
                {order.items.map((item: any) => (
                  <div
                    key={item._id}
                    className="bg-gray-50 rounded-md border border-gray-200 p-4"
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
            ) : (
              <div className="bg-gray-50 rounded-md border border-gray-200 p-4 text-center">
                <p className="text-sm text-gray-500">No hay ítems en este pedido</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Delivery Feedback (Mejora #5) */}
        {isDelivered && deliveryResult && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-emerald-800 mb-2">
                ✓ Pedido entregado. Stock actualizado.
              </h2>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Ítems entregados:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {deliveryResult.deliveredItems.map((item) => {
                    // Find item in order.items
                    const itemData = order.items?.find((i: any) => i._id === item.itemId);
                    return (
                      <li key={item.itemId}>
                        {itemData?.nombre || 'Item'}: {item.cantidad} {itemData?.unidad || ''} 
                        {itemData && ` (Stock restante: ${item.newStock} ${itemData.unidad})`}
                      </li>
                    );
                  })}
                </ul>
              </div>
              
              {deliveryResult.lowStockItems.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <h3 className="text-sm font-medium text-yellow-800 mb-2">
                    ⚠️ Alertas de stock bajo:
                  </h3>
                  <ul className="space-y-2">
                    {deliveryResult.lowStockItems.map((item) => (
                      <li key={item.itemId} className="flex items-center gap-2">
                        <Badge variant="bajo-minimo">Bajo mínimo</Badge>
                        <span className="text-sm text-yellow-800">
                          {item.nombre}: {item.stock_actual} / {item.stock_minimo} (mínimo)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <Button
              variant="secondary"
              onClick={() => router.push('/admin/pedidos')}
              className="mt-4"
            >
              Volver a pedidos
            </Button>
          </div>
        )}
        
      </PageContainer>
      
      {/* Sticky CTA Button */}
      {order.status === 'pendiente' && !isDelivered && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 md:p-6 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Button
              variant="primary"
              onClick={handleDeliver}
              disabled={isDelivering}
              className="w-full md:w-auto"
            >
              {isDelivering ? 'Entregando...' : 'Marcar como entregado'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
