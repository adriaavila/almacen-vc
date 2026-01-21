'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';

export default function MantenimientoBasicoDashboardPage() {
  const activos = useQuery(api.activos.list);
  const repuestos = useQuery(api.repuestos.list);
  const trabajosPendientes = useQuery(api.trabajosMantenimiento.getPendientes);
  const repuestosBajoStock = useQuery(api.repuestos.getLowStock);

  // Calculate statistics
  const stats = useMemo(() => {
    if (activos === undefined || repuestos === undefined || trabajosPendientes === undefined) {
      return {
        activosOperativos: 0,
        activosEnReparacion: 0,
        repuestosBajoStock: 0,
        trabajosPendientes: 0,
      };
    }

    const activosOperativos = activos.filter((a) => a.estado === 'operativo').length;
    const activosEnReparacion = activos.filter((a) => a.estado === 'en_reparacion').length;

    return {
      activosOperativos,
      activosEnReparacion,
      repuestosBajoStock: repuestosBajoStock?.length || 0,
      trabajosPendientes: trabajosPendientes.length,
    };
  }, [activos, repuestos, trabajosPendientes, repuestosBajoStock]);

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  // Loading state
  if (
    activos === undefined ||
    repuestos === undefined ||
    trabajosPendientes === undefined ||
    repuestosBajoStock === undefined
  ) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="text-center py-12 text-gray-500">
            <p>Cargando dashboard de mantenimiento...</p>
          </div>
        </PageContainer>
      </div>
    );
  }

  // Get top 5 trabajos pendientes
  const topTrabajosPendientes = trabajosPendientes.slice(0, 5);

  // Get top 5 repuestos bajo stock
  const topRepuestosBajoStock = repuestosBajoStock.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Mantenimiento</h1>
          <p className="text-sm text-gray-500 mt-1">Vista de activos, repuestos y trabajos</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activos Operativos</CardTitle>
              <svg
                className="h-4 w-4 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.activosOperativos}</div>
              <p className="text-xs text-muted-foreground">En funcionamiento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Reparación</CardTitle>
              <svg
                className="h-4 w-4 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.activosEnReparacion}</div>
              <p className="text-xs text-muted-foreground">Requieren atención</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Repuestos Bajo Stock</CardTitle>
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
              <div className="text-2xl font-bold text-red-600">{stats.repuestosBajoStock}</div>
              <p className="text-xs text-muted-foreground">
                {stats.repuestosBajoStock === 1 ? 'Requiere atención' : 'Requieren atención'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trabajos Pendientes</CardTitle>
              <svg
                className="h-4 w-4 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.trabajosPendientes}</div>
              <p className="text-xs text-muted-foreground">Esperando ejecución</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            <Link href="/mantenimiento/activos" prefetch={false}>
              <Button variant="secondary" className="h-12">
                Ver Activos
              </Button>
            </Link>
            <Link href="/mantenimiento/repuestos" prefetch={false}>
              <Button variant="secondary" className="h-12">
                Ver Repuestos
              </Button>
            </Link>
            <Link href="/mantenimiento/trabajos" prefetch={false}>
              <Button variant="secondary" className="h-12">
                Ver Trabajos
              </Button>
            </Link>
            <Link href="/mantenimiento/repuestos/ingreso" prefetch={false}>
              <Button variant="primary" className="h-12">
                Registrar Ingreso
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trabajos Pendientes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trabajos Pendientes</CardTitle>
                  <CardDescription>Últimos trabajos esperando ejecución</CardDescription>
                </div>
                {trabajosPendientes.length > 5 && (
                  <Link href="/mantenimiento/trabajos" prefetch={false}>
                    <Button variant="secondary" className="text-xs px-3 py-1 h-auto">
                      Ver todos
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {topTrabajosPendientes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay trabajos pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topTrabajosPendientes.map((trabajo) => (
                    <div
                      key={trabajo._id}
                      className="flex items-start justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{trabajo.activo?.nombre || 'Activo eliminado'}</p>
                        <p className="text-sm text-gray-600 mt-1">{trabajo.descripcion}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={trabajo.tipo === 'emergencia' ? 'bajo-minimo' : 'ok'}>
                            {trabajo.tipo === 'preventivo' ? 'Preventivo' : trabajo.tipo === 'correctivo' ? 'Correctivo' : 'Emergencia'}
                          </Badge>
                          <span className="text-xs text-gray-500">{formatDate(trabajo.createdAt)}</span>
                        </div>
                      </div>
                      <Link href={`/mantenimiento/trabajos/${trabajo._id}`} prefetch={false}>
                        <Button variant="primary" className="text-xs px-3 py-1 h-auto ml-3">
                          Ver
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Repuestos Bajo Stock */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Repuestos Bajo Stock</CardTitle>
                  <CardDescription>Repuestos que requieren atención</CardDescription>
                </div>
                {repuestosBajoStock.length > 5 && (
                  <Link href="/mantenimiento/repuestos" prefetch={false}>
                    <Button variant="secondary" className="text-xs px-3 py-1 h-auto">
                      Ver todos
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {topRepuestosBajoStock.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay repuestos con bajo stock</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topRepuestosBajoStock.map((repuesto) => (
                    <div
                      key={repuesto._id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-md border border-red-200"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{repuesto.nombre}</p>
                        <p className="text-sm text-gray-600">
                          Stock: <span className="text-red-600 font-medium">{repuesto.stock_actual}</span> / Mínimo: {repuesto.stock_minimo} {repuesto.unidad}
                        </p>
                      </div>
                      <Link href={`/mantenimiento/repuestos/${repuesto._id}`} prefetch={false}>
                        <Button variant="primary" className="text-xs px-3 py-1 h-auto">
                          Ver
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
