'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { Button } from '@/components/ui/Button';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Toast } from '@/components/ui/Toast';

export default function MigrationPage() {
  const migrateOrderItems = useMutation(api.orders.migrateOrderItems);
  const reprocessDeliveredOrder = useMutation(api.orders.reprocessDeliveredOrder);
  const reprocessAllDeliveredOrders = useMutation(api.orders.reprocessAllDeliveredOrders);
  const getOrderByDateRange = useQuery(api.orders.getOrderByDateRange, {
    startDate: new Date('2026-01-22').getTime(),
    endDate: new Date('2026-01-23').getTime(),
    area: 'Cafetín',
    status: 'entregado',
  });
  const migrateMovements = useMutation(api.migration.migrateMovements);
  const getMigrationStatus = useQuery(api.migration.getMigrationStatus);

  const [migratingOrderItems, setMigratingOrderItems] = useState(false);
  const [reprocessingOrder, setReprocessingOrder] = useState(false);
  const [reprocessingAll, setReprocessingAll] = useState(false);
  const [migratingMovements, setMigratingMovements] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
  }>({
    message: '',
    type: 'info',
    isOpen: false,
  });
  const [confirmAction, setConfirmAction] = useState<
    'migrateOrderItems' | 'reprocessAll' | 'reprocessJan22' | 'migrateMovements' | null
  >(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  const handleMigrateOrderItems = async () => {
    setMessage(null);
    setError(null);
    setMigratingOrderItems(true);

    try {
      const result = await migrateOrderItems({ batchSize: 50 });
      setMessage(
        `✅ Migración de orderItems completada:\n` +
        `- Migrados: ${result.migrated}\n` +
        `- Errores: ${result.errors}\n` +
        `- Restantes: ${result.remaining}\n` +
        `- Total: ${result.total}`
      );
      setToast({
        message: `Migrados ${result.migrated} orderItems`,
        type: 'success',
        isOpen: true,
      });
    } catch (err: any) {
      setError(`❌ Error: ${err.message || 'Error desconocido'}`);
      setToast({
        message: `Error: ${err.message || 'Error desconocido'}`,
        type: 'error',
        isOpen: true,
      });
    } finally {
      setMigratingOrderItems(false);
    }
  };

  const handleReprocessAllDelivered = async () => {
    setMessage(null);
    setError(null);
    setReprocessingAll(true);

    try {
      const result = await reprocessAllDeliveredOrders({
        batchSize: 10,
        area: 'Cafetín',
      });
      setMessage(
        `✅ Reprocesamiento completado:\n` +
        `- Procesados exitosamente: ${result.processed}\n` +
        `- Fallidos: ${result.failed}\n` +
        `- Restantes: ${result.remaining}\n` +
        `- Total: ${result.total}`
      );
      setToast({
        message: `Reprocesados ${result.processed} pedidos`,
        type: 'success',
        isOpen: true,
      });
    } catch (err: any) {
      setError(`❌ Error: ${err.message || 'Error desconocido'}`);
      setToast({
        message: `Error: ${err.message || 'Error desconocido'}`,
        type: 'error',
        isOpen: true,
      });
    } finally {
      setReprocessingAll(false);
    }
  };

  const handleReprocessJan22 = async () => {
    if (!selectedOrderId) {
      setError('Por favor selecciona un pedido del 22 de enero');
      return;
    }

    setMessage(null);
    setError(null);
    setReprocessingOrder(true);

    try {
      const result = await reprocessDeliveredOrder({
        orderId: selectedOrderId as Id<'orders'>,
      });
      setMessage(
        `✅ Pedido reprocesado:\n` +
        `- Procesados: ${result.processed}\n` +
        `- Errores: ${result.errors}\n` +
        `\nProductos trasladados:\n` +
        result.items
          .filter((i) => i.transferred)
          .map((i) => `  • ${i.productName}: ${i.cantidad}`)
          .join('\n')
      );
      setToast({
        message: `Pedido reprocesado correctamente`,
        type: 'success',
        isOpen: true,
      });
    } catch (err: any) {
      setError(`❌ Error: ${err.message || 'Error desconocido'}`);
      setToast({
        message: `Error: ${err.message || 'Error desconocido'}`,
        type: 'error',
        isOpen: true,
      });
    } finally {
      setReprocessingOrder(false);
    }
  };

  const handleMigrateMovements = async () => {
    setMessage(null);
    setError(null);
    setMigratingMovements(true);

    try {
      const result = await migrateMovements({ batchSize: 50 });
      setMessage(
        `✅ Migración de movimientos completada:\n` +
        `- Migrados: ${result.migrated}\n` +
        `- Omitidos: ${result.skipped}\n` +
        `- Restantes: ${result.remaining}\n` +
        `- Total: ${result.total}`
      );
      setToast({
        message: `Migrados ${result.migrated} movimientos`,
        type: 'success',
        isOpen: true,
      });
    } catch (err: any) {
      setError(`❌ Error: ${err.message || 'Error desconocido'}`);
      setToast({
        message: `Error: ${err.message || 'Error desconocido'}`,
        type: 'error',
        isOpen: true,
      });
    } finally {
      setMigratingMovements(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    if (confirmAction === 'migrateOrderItems') {
      await handleMigrateOrderItems();
    } else if (confirmAction === 'reprocessAll') {
      await handleReprocessAllDelivered();
    } else if (confirmAction === 'reprocessJan22') {
      await handleReprocessJan22();
    } else if (confirmAction === 'migrateMovements') {
      await handleMigrateMovements();
    }

    setConfirmAction(null);
  };

  const getConfirmModalProps = () => {
    switch (confirmAction) {
      case 'migrateOrderItems':
        return {
          title: 'Migrar OrderItems',
          message:
            '¿Migrar orderItems sin productId a productos? Esto buscará el producto correspondiente usando legacyItemId.',
          confirmText: 'Migrar',
          variant: 'default' as const,
          isLoading: migratingOrderItems,
        };
      case 'reprocessAll':
        return {
          title: 'Reprocesar Todos los Pedidos Entregados',
          message:
            '¿Reprocesar todos los pedidos entregados de Cafetín para aplicar traslados de stock correctos?',
          confirmText: 'Reprocesar',
          variant: 'default' as const,
          isLoading: reprocessingAll,
        };
      case 'reprocessJan22':
        return {
          title: 'Reprocesar Pedido del 22 de Enero',
          message: `¿Reprocesar el pedido seleccionado para aplicar traslados de stock a cafetín?`,
          confirmText: 'Reprocesar',
          variant: 'default' as const,
          isLoading: reprocessingOrder,
        };
      case 'migrateMovements':
        return {
          title: 'Migrar Movimientos Históricos',
          message:
            '¿Migrar movimientos de stock_movements a movements? Esto preservará el historial con legacyMovementId.',
          confirmText: 'Migrar',
          variant: 'default' as const,
          isLoading: migratingMovements,
        };
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Migración de Pedidos y Datos
          </h1>
          <p className="text-sm text-gray-500 text-center">
            Utiliza esta página para migrar pedidos pasados y usar completamente las nuevas tablas
          </p>
        </div>

        {/* Migration Status */}
        {getMigrationStatus && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de Migración</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Items</p>
                <p className="text-lg font-semibold">
                  {getMigrationStatus.items.migrated} / {getMigrationStatus.items.total}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Movimientos</p>
                <p className="text-lg font-semibold">
                  {getMigrationStatus.stockMovements.migrated} /{' '}
                  {getMigrationStatus.stockMovements.total}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Productos</p>
                <p className="text-lg font-semibold">{getMigrationStatus.products}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Inventario</p>
                <p className="text-lg font-semibold">{getMigrationStatus.inventory}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {message && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 whitespace-pre-line">
              {message}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
              {error}
            </div>
          )}

          {/* Migrate OrderItems */}
          <div>
            <h2 className="text-lg font-semibold text-emerald-600 mb-2">
              1. Migrar OrderItems a Productos
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Migra todos los orderItems que aún usan itemId para que usen productId. Ejecuta esto
              varias veces hasta que no queden orderItems por migrar.
            </p>
            <Button
              onClick={() => setConfirmAction('migrateOrderItems')}
              disabled={migratingOrderItems}
              variant="primary"
            >
              {migratingOrderItems ? 'Migrando...' : 'Migrar OrderItems (lote de 50)'}
            </Button>
          </div>

          {/* Reprocess January 22nd Order */}
          <div>
            <h2 className="text-lg font-semibold text-blue-600 mb-2">
              2. Reprocesar Pedido del 22 de Enero
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Encuentra y reprocesa el pedido del 22 de enero desde Cafetín para aplicar el
              traslado de stock correcto.
            </p>
            {getOrderByDateRange && getOrderByDateRange.length > 0 ? (
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Selecciona el pedido:
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">-- Selecciona un pedido --</option>
                  {getOrderByDateRange.map((order) => (
                    <option key={order._id} value={order._id}>
                      Pedido del {new Date(order.createdAt).toLocaleDateString('es-ES')} -{' '}
                      {order.area}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => setConfirmAction('reprocessJan22')}
                  disabled={reprocessingOrder || !selectedOrderId}
                  variant="primary"
                  className="mt-2"
                >
                  {reprocessingOrder ? 'Reprocesando...' : 'Reprocesar Pedido Seleccionado'}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                No se encontraron pedidos del 22 de enero desde Cafetín.
              </p>
            )}
          </div>

          {/* Reprocess All Delivered Orders */}
          <div>
            <h2 className="text-lg font-semibold text-purple-600 mb-2">
              3. Reprocesar Todos los Pedidos Entregados de Cafetín
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Reprocesa todos los pedidos entregados desde Cafetín para aplicar traslados de stock
              correctos. Ejecuta esto varias veces hasta completar todos los pedidos.
            </p>
            <Button
              onClick={() => setConfirmAction('reprocessAll')}
              disabled={reprocessingAll}
              variant="primary"
            >
              {reprocessingAll ? 'Reprocesando...' : 'Reprocesar Pedidos (lote de 10)'}
            </Button>
          </div>

          {/* Migrate Movements */}
          <div>
            <h2 className="text-lg font-semibold text-orange-600 mb-2">
              4. Migrar Movimientos Históricos
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Migra movimientos de stock_movements a movements. Ejecuta esto varias veces hasta
              completar la migración.
            </p>
            <Button
              onClick={() => setConfirmAction('migrateMovements')}
              disabled={migratingMovements}
              variant="primary"
            >
              {migratingMovements ? 'Migrando...' : 'Migrar Movimientos (lote de 50)'}
            </Button>
          </div>
        </div>
      </PageContainer>

      {/* Confirmation Modal */}
      {confirmAction && getConfirmModalProps() && (
        <ConfirmationModal
          isOpen={confirmAction !== null}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
          {...getConfirmModalProps()!}
        />
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
