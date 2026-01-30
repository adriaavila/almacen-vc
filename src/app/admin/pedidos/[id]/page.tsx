'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/Badge';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as Id<"orders">;

  const order = useQuery(api.orders.getById, orderId ? { id: orderId } : "skip");
  const updateItems = useMutation(api.orders.updateItems);
  const deliverOrder = useMutation(api.orders.deliver);

  const [isDelivering, setIsDelivering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuantities, setEditedQuantities] = useState<{ [key: string]: number }>({});

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
  }>({
    message: '',
    type: 'info',
    isOpen: false,
  });
  const [deliveryResult, setDeliveryResult] = useState<{
    deliveredItems: Array<{ itemId: string; cantidad: number; newStock: number }>;
    lowStockItems: Array<{ itemId: string; nombre: string; stock_actual: number; stock_minimo: number }>;
  } | null>(null);
  const [isDelivered, setIsDelivered] = useState(false);

  // Initialize edited quantities when entering edit mode
  const startEditing = () => {
    if (!order?.items) return;
    const initialQuantities: { [key: string]: number } = {};
    order.items.forEach((item: any) => {
      initialQuantities[item.orderItemId] = item.cantidad;
    });
    setEditedQuantities(initialQuantities);
    setIsEditing(true);
  };

  const handleQuantityChange = (orderItemId: string, value: string) => {
    const qty = parseInt(value);
    if (!isNaN(qty) && qty >= 0) {
      setEditedQuantities(prev => ({
        ...prev,
        [orderItemId]: qty
      }));
    }
  };

  const handleSaveQuantities = async () => {
    if (!orderId) return;
    setIsDelivering(true); // Reuse loading state
    try {
      const itemsToUpdate = Object.entries(editedQuantities).map(([id, qty]) => ({
        orderItemId: id as any,
        cantidad: qty
      }));

      await updateItems({
        orderId,
        items: itemsToUpdate
      });

      setToast({
        message: 'Cantidades actualizadas correctamente',
        type: 'success',
        isOpen: true
      });
      setIsEditing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar cantidades';
      setToast({
        message,
        type: 'error',
        isOpen: true
      });
    } finally {
      setIsDelivering(false);
    }
  };

  const handleDeliver = async () => {
    if (!orderId || !order) return;

    setIsDelivering(true);

    try {
      const result = await deliverOrder({ id: orderId });
      setDeliveryResult(result);
      setIsDelivered(true);
      setToast({
        message: 'Pedido entregado correctamente',
        type: 'success',
        isOpen: true,
      });
      setIsDelivering(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo entregar el pedido. Intente de nuevo.';
      setToast({
        message,
        type: 'error',
        isOpen: true,
      });
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

  // Debug logging
  useEffect(() => {
    if (order) {
      console.log('Order Status:', order.status, 'Is Delivered:', isDelivered);
    }
  }, [order, isDelivered]);

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
        </div>

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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Ítems del Pedido</h2>
              {order.status === 'pendiente' && !isDelivered && (
                <div>
                  {!isEditing ? (
                    <Button variant="secondary" onClick={startEditing} disabled={isDelivering}>
                      Editar Cantidades
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setIsEditing(false)} disabled={isDelivering}>
                        Cancelar
                      </Button>
                      <Button variant="primary" onClick={handleSaveQuantities} disabled={isDelivering}>
                        Guardar Cambios
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

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
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editedQuantities[item.orderItemId] ?? item.cantidad}
                            onChange={(e) => handleQuantityChange(item.orderItemId, e.target.value)}
                          />
                          <span className="text-sm font-medium text-gray-900">{item.unidad}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-gray-900">
                          {item.cantidad} {item.unidad}
                        </span>
                      )}
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
              <h2 className="text-xl font-semibold text-emerald-800 mb-2 text-center">
                ✓ Pedido entregado. Stock actualizado.
              </h2>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2 text-center">Ítems entregados:</h3>
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
                  <h3 className="text-sm font-medium text-yellow-800 mb-2 text-center">
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
      {order.status === 'pendiente' && !isDelivered && !isEditing && (
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
