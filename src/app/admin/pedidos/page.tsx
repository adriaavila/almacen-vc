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
    <div className="bg-white rounded-lg shadow-sm border-l-4 border-l-amber-500 border border-t-gray-200 border-r-gray-200 border-b-gray-200 overflow-hidden transition-all duration-200">
      <div className="p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="mb-1">
              <span className="text-lg font-bold text-gray-900">{order.area}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                📅 {formatDate(order.createdAt)}
              </span>
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
              className="shadow-sm"
              size="sm"
            >
              {deliveringId === order._id ? 'Entregando...' : 'Entregar'}
            </Button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors p-1"
            >
              {isExpanded ? 'Ocultar' : 'Ver detalle'}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4">
          {orderDetails === undefined ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-pulse text-sm text-gray-400">Cargando detalles...</div>
            </div>
          ) : orderDetails === null ? (
            <div className="text-sm text-red-600 py-2 bg-red-50 px-3 rounded">Error al cargar detalles del pedido</div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  {isEditing ? 'Editando Cantidades' : 'Ítems del Pedido'}
                </h3>

                {!isEditing ? (
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-full transition-colors border border-emerald-200 font-medium"
                  >
                    <Pencil size={14} />
                    Editar
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEditing}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-white hover:bg-gray-100 rounded-full transition-colors border border-gray-200 font-medium shadow-sm"
                    >
                      <X size={14} />
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-full transition-colors font-medium shadow-sm"
                    >
                      <Check size={14} />
                      Guardar
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
                        className={`
                          relative overflow-hidden rounded-lg border transition-all duration-200
                          ${isDeleted
                            ? 'bg-red-50 border-red-100'
                            : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'}
                          ${isEditing ? 'p-3' : 'p-3'}
                        `}
                      >
                        {/* Deleted Overlay Strip */}
                        {isDeleted && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400" />
                        )}

                        <div className="flex items-center justify-between gap-3">
                          <div className={`flex-1 min-w-0 ${isDeleted ? 'opacity-50' : ''}`}>
                            <div className="font-medium text-gray-900 truncate">
                              {item.nombre}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.categoria}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="flex items-center gap-3">
                              {/* Quantity Stepper */}
                              <div className={`flex items-center bg-gray-50 rounded-lg border border-gray-200 ${isDeleted ? 'opacity-50' : ''}`}>
                                <button
                                  onClick={() => handleDecrement(item.orderItemId)}
                                  className="p-2 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-l-lg transition-colors disabled:opacity-30"
                                  disabled={currentQty <= 0}
                                >
                                  <Minus size={14} strokeWidth={2.5} />
                                </button>
                                <div className="w-10 text-center text-sm font-semibold text-gray-900">
                                  {currentQty}
                                </div>
                                <button
                                  onClick={() => handleIncrement(item.orderItemId)}
                                  className="p-2 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-r-lg transition-colors"
                                >
                                  <Plus size={14} strokeWidth={2.5} />
                                </button>
                              </div>

                              <span className="text-xs font-medium text-gray-400 w-8 text-center">
                                {item.unidad}
                              </span>

                              {/* Restore / Delete Toggle */}
                              {isDeleted ? (
                                <button
                                  onClick={() => handleIncrement(item.orderItemId)} // Increment to 1 to restore
                                  className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                                  title="Restaurar"
                                >
                                  <Check size={16} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDelete(item.orderItemId)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar del pedido"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                              <span className="text-sm font-bold text-gray-900">
                                {item.cantidad}
                              </span>
                              <span className="text-xs font-medium text-gray-500">
                                {item.unidad}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
                  No hay ítems en este pedido
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
