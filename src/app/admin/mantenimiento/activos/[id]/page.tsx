'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function ActivoDetailPage() {
  const params = useParams();
  const activoId = (params?.id as string) as Id<'activos'>;
  
  const activo = useQuery(api.activos.getById, { id: activoId });
  const trabajos = useQuery(api.trabajosMantenimiento.getByActivo, { activoId });

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'operativo':
        return 'ok';
      case 'en_reparacion':
        return 'bajo-minimo';
      case 'fuera_servicio':
        return 'bajo-minimo';
      default:
        return 'ok';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'operativo':
        return 'Operativo';
      case 'en_reparacion':
        return 'En Reparación';
      case 'fuera_servicio':
        return 'Fuera de Servicio';
      default:
        return estado;
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

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'preventivo':
        return 'Preventivo';
      case 'correctivo':
        return 'Correctivo';
      case 'emergencia':
        return 'Emergencia';
      default:
        return tipo;
    }
  };

  const getEstadoTrabajoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_proceso':
        return 'En Proceso';
      case 'completado':
        return 'Completado';
      default:
        return estado;
    }
  };

  // Loading state
  if (activo === undefined || trabajos === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="text-center py-12 text-gray-500">
            <p>Cargando activo...</p>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (!activo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="text-center py-12 text-gray-500">
            <p>Activo no encontrado</p>
            <Link href="/admin/mantenimiento/activos">
              <Button variant="secondary" className="mt-4">
                Volver a Activos
              </Button>
            </Link>
          </div>
        </PageContainer>
      </div>
    );
  }

  const trabajosOrdenados = [...trabajos].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <div className="mb-6">
          <Link href="/admin/mantenimiento/activos">
            <Button variant="secondary" className="mb-4">
              ← Volver a Activos
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={getEstadoBadgeVariant(activo.estado)}>
                  {getEstadoLabel(activo.estado)}
                </Badge>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {activo.tipo}
                </span>
              </div>
            </div>
            <Link href={`/admin/mantenimiento/trabajos/new?activo=${activo._id}`}>
              <Button variant="primary">Nuevo Trabajo</Button>
            </Link>
          </div>
        </div>

        {/* Activo Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">Información del Activo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Ubicación</p>
              <p className="text-base font-medium text-gray-900">{activo.ubicacion}</p>
            </div>
            {activo.descripcion && (
              <div>
                <p className="text-sm text-gray-500">Descripción</p>
                <p className="text-base text-gray-900">{activo.descripcion}</p>
              </div>
            )}
            {activo.fecha_instalacion && (
              <div>
                <p className="text-sm text-gray-500">Fecha de Instalación</p>
                <p className="text-base text-gray-900">{formatDate(activo.fecha_instalacion)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Historial de Trabajos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">Historial de Trabajos</h2>
          {trabajosOrdenados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay trabajos registrados para este activo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trabajosOrdenados.map((trabajo) => (
                <div
                  key={trabajo._id}
                  className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={trabajo.tipo === 'emergencia' ? 'bajo-minimo' : 'ok'}>
                          {getTipoLabel(trabajo.tipo)}
                        </Badge>
                        <Badge variant={trabajo.estado === 'completado' ? 'ok' : 'bajo-minimo'}>
                          {getEstadoTrabajoLabel(trabajo.estado)}
                        </Badge>
                        <span className="text-xs text-gray-500">{formatDate(trabajo.createdAt)}</span>
                      </div>
                      <p className="text-base text-gray-900 mb-2">{trabajo.descripcion}</p>
                      {trabajo.observaciones && (
                        <p className="text-sm text-gray-600">{trabajo.observaciones}</p>
                      )}
                      {trabajo.tecnico && (
                        <p className="text-xs text-gray-500 mt-2">Técnico: {trabajo.tecnico}</p>
                      )}
                    </div>
                    <Link href={`/admin/mantenimiento/trabajos/${trabajo._id}`}>
                      <Button variant="primary" className="text-xs px-3 py-1 h-auto">
                        Ver Detalle
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
