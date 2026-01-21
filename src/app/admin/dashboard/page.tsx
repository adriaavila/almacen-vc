'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DashboardPage() {
  const items = useQuery(api.items.list);
  const lowStockItems = useQuery(api.items.getLowStock);
  const pendingOrders = useQuery(api.orders.getPending);
  const recentMovements = useQuery(api.stockMovements.getRecentStockMovements, { limit: 10 });

  // Calculate statistics
  const stats = useMemo(() => {
    if (items === undefined) {
      return {
        totalItems: 0,
        lowStockCount: 0,
        pendingOrdersCount: 0,
        recentMovementsCount: 0,
      };
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    const recentMovementsCount = recentMovements
      ? recentMovements.filter((m) => m.createdAt >= oneDayAgo).length
      : 0;

    return {
      totalItems: items.length,
      lowStockCount: lowStockItems?.length || 0,
      pendingOrdersCount: pendingOrders?.length || 0,
      recentMovementsCount,
    };
  }, [items, lowStockItems, pendingOrders, recentMovements]);

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  const formatDateShort = (timestamp: number) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  // Loading state
  if (
    items === undefined ||
    lowStockItems === undefined ||
    pendingOrders === undefined ||
    recentMovements === undefined
  ) {
    return (
      <PageContainer>
        <div className="text-center py-12 text-gray-500">
          <p>Cargando dashboard...</p>
        </div>
      </PageContainer>
    );
  }

  // Get top 5 low stock items
  const topLowStockItems = lowStockItems.slice(0, 5);

  // Get recent pending orders (last 5)
  const recentPendingOrders = pendingOrders.slice(0, 5);

  return (
    <PageContainer>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <svg
                className="h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
              <p className="text-xs text-muted-foreground">Productos en inventario</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bajo Stock</CardTitle>
              <svg
                className="h-4 w-4 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.lowStockCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.lowStockCount === 1 ? 'Item requiere atención' : 'Items requieren atención'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Pendientes</CardTitle>
              <svg
                className="h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingOrdersCount}</div>
              <p className="text-xs text-muted-foreground">Esperando entrega</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Movimientos Recientes</CardTitle>
              <svg
                className="h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentMovementsCount}</div>
              <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Low Stock Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Alertas de Bajo Stock</CardTitle>
                  <CardDescription>Items que requieren atención inmediata</CardDescription>
                </div>
                {lowStockItems.length > 5 && (
                  <Link href="/admin/inventario">
                    <Button variant="secondary" className="text-xs px-3 py-1 h-auto">
                      Ver todos
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {topLowStockItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay items con bajo stock</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Stock Actual</TableHead>
                      <TableHead className="text-right">Stock Mínimo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topLowStockItems.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <Link
                            href={`/admin/inventario/${item._id}`}
                            className="text-emerald-600 hover:text-emerald-800 font-medium"
                          >
                            {item.nombre}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-red-600 font-semibold">{item.stock_actual}</span>
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {item.stock_minimo}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Pending Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pedidos Pendientes</CardTitle>
                  <CardDescription>Últimos pedidos esperando entrega</CardDescription>
                </div>
                {pendingOrders.length > 5 && (
                  <Link href="/admin/pedidos">
                    <Button variant="secondary" className="text-xs px-3 py-1 h-auto">
                      Ver todos
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {recentPendingOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay pedidos pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPendingOrders.map((order) => (
                    <div
                      key={order._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{order.area}</p>
                        <p className="text-sm text-gray-500">{formatDateShort(order.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={order.status}>
                          {order.status === 'pendiente' ? 'Pendiente' : 'Entregado'}
                        </Badge>
                        <Link href={`/admin/pedidos/${order._id}`}>
                          <Button variant="primary" className="text-xs px-3 py-1 h-auto">
                            Ver
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>Últimos movimientos de stock</CardDescription>
              </div>
              <Link href="/admin/movements">
                <Button variant="secondary" className="text-xs px-3 py-1 h-auto">
                  Ver todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentMovements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No hay movimientos recientes</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMovements.map((movement) => (
                    <TableRow key={movement._id}>
                      <TableCell>
                        <Badge
                          variant={movement.type === 'ingreso' ? 'ok' : 'bajo-minimo'}
                        >
                          {movement.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {movement.item ? (
                          <Link
                            href={`/admin/inventario/${movement.itemId}`}
                            className="text-emerald-600 hover:text-emerald-800"
                          >
                            {movement.item.nombre}
                          </Link>
                        ) : (
                          <span className="text-gray-400">Item eliminado</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {movement.cantidad} {movement.item?.unidad || ''}
                      </TableCell>
                      <TableCell className="capitalize">{movement.motivo}</TableCell>
                      <TableCell className="text-right text-sm text-gray-500">
                        {formatDateShort(movement.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
    </PageContainer>
  );
}
