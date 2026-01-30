'use client';

import { useState } from 'react';
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
import { Pencil, Plus, Minus, Trash2, Check, X } from 'lucide-react';

// Component for individual order card with expandable details and inline editing
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuantities, setEditedQuantities] = useState<{ [key: string]: number }>({});
  const [isSaving, setIsSaving] = useState(false);

  const orderDetails = useQuery(
    api.orders.getById,
    isExpanded ? { id: order._id } : "skip"
  );
  const updateItems = useMutation(api.orders.updateItems);

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  const startEditing = () => {
    if (!orderDetails?.items) return;
    const initial: { [key: string]: number } = {};
    orderDetails.items.forEach((item: any) => {
      initial[item.orderItemId] = item.cantidad;
    });
    setEditedQuantities(initial);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedQuantities({});
  };

  const handleIncrement = (orderItemId: string) => {
    setEditedQuantities(prev => ({
      ...prev,
      [orderItemId]: (prev[orderItemId] || 0) + 1
    }));
  };

  const handleDecrement = (orderItemId: string) => {
    setEditedQuantities(prev => ({
      ...prev,
      [orderItemId]: Math.max(0, (prev[orderItemId] || 0) - 1)
    }));
  };

  const handleDelete = (orderItemId: string) => {
    setEditedQuantities(prev => ({
      ...prev,
      [orderItemId]: 0
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const items = Object.entries(editedQuantities).map(([id, qty]) => ({
        orderItemId: id as Id<"orderItems">,
        cantidad: qty
      }));
      await updateItems({ orderId: order._id, items });
      setIsEditing(false);
      setEditedQuantities({});
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
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
              disabled={deliveringId === order._id || isEditing}
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
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Ítems del Pedido</h3>
                {!isEditing ? (
                  <button
                    onClick={startEditing}
                    className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                    title="Editar cantidades"
                  >
                    <Pencil size={18} />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEditing}
                      disabled={isSaving}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Cancelar"
                    >
                      <X size={18} />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                      title="Guardar"
                    >
                      <Check size={18} />
                    </button>
                  </div>
                )}
              </div>

              {orderDetails.items && orderDetails.items.length > 0 ? (
                <div className="space-y-2">
                  {orderDetails.items.map((item: any) => {
                    const currentQty = isEditing
                      ? (editedQuantities[item.orderItemId] ?? item.cantidad)
                      : item.cantidad;
                    const isDeleted = isEditing && currentQty === 0;

                    return (
                      <div
                        key={item._id}
                        className={`bg-white rounded-md border border-gray-200 p-3 ${isDeleted ? 'opacity-50 line-through' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="mb-1">
                              <span className="text-base font-semibold text-gray-900">{item.nombre}</span>
                            </div>
                            <span className="text-xs text-gray-500">{item.categoria}</span>
                          </div>

                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDecrement(item.orderItemId)}
                                className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                                disabled={currentQty <= 0}
                              >
                                <Minus size={16} />
                              </button>
                              <span className="w-12 text-center font-medium text-gray-900">
                                {currentQty} {item.unidad}
                              </span>
                              <button
                                onClick={() => handleIncrement(item.orderItemId)}
                                className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                              >
                                <Plus size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(item.orderItemId)}
                                className="p-1 rounded-full bg-red-50 hover:bg-red-100 text-red-500 ml-2"
                                title="Eliminar item"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-gray-900">
                              {item.cantidad} {item.unidad}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
      router.push(`/admin/pedidos/${orderId}`);
    }
  };

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
