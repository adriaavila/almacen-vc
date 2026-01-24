'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function TrabajoBasicoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const trabajoId = id as Id<'trabajos_mantenimiento'>;
  
  const trabajo = useQuery(api.trabajosMantenimiento.getById, { id: trabajoId });

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

  const getEstadoLabel = (estado: string) => {
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
  if (trabajo === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="text-center py-12 text-gray-500">
            <p>Cargando trabajo...</p>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (!trabajo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="text-center py-12 text-gray-500">
            <p>Trabajo no encontrado</p>
            <Link href="/mantenimiento/trabajos">
              <Button variant="secondary" className="mt-4">
                Volver a Trabajos
              </Button>
            </Link>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <div className="mb-6">
          <Link href="/mantenimiento/trabajos">
            <Button variant="secondary" className="mb-4">
              ← Volver a Trabajos
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {trabajo.activo?.nombre || 'Activo eliminado'}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={trabajo.tipo === 'emergencia' ? 'bajo-minimo' : 'ok'}>
                  {getTipoLabel(trabajo.tipo)}
                </Badge>
                <Badge variant={trabajo.estado === 'completado' ? 'ok' : 'bajo-minimo'}>
                  {getEstadoLabel(trabajo.estado)}
                </Badge>
                <span className="text-sm text-gray-500">{formatDate(trabajo.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trabajo Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Trabajo</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Descripción</p>
              <p className="text-base text-gray-900">{trabajo.descripcion}</p>
            </div>
            {trabajo.tecnico && (
              <div>
                <p className="text-sm text-gray-500">Técnico</p>
                <p className="text-base text-gray-900">{trabajo.tecnico}</p>
              </div>
            )}
            {trabajo.observaciones && (
              <div>
                <p className="text-sm text-gray-500">Observaciones</p>
                <p className="text-base text-gray-900">{trabajo.observaciones}</p>
              </div>
            )}
            {trabajo.fecha_inicio && (
              <div>
                <p className="text-sm text-gray-500">Fecha de Inicio</p>
                <p className="text-base text-gray-900">{formatDate(trabajo.fecha_inicio)}</p>
              </div>
            )}
            {trabajo.fecha_fin && (
              <div>
                <p className="text-sm text-gray-500">Fecha de Finalización</p>
                <p className="text-base text-gray-900">{formatDate(trabajo.fecha_fin)}</p>
              </div>
            )}
            {trabajo.activo && (
              <div>
                <p className="text-sm text-gray-500">Activo</p>
                <p className="text-base text-gray-900">{trabajo.activo.nombre}</p>
                <p className="text-sm text-gray-600">{trabajo.activo.ubicacion}</p>
              </div>
            )}
          </div>
        </div>

        {/* Repuestos en Uso */}
        {trabajo.repuestos && trabajo.repuestos.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Repuestos en Uso</h2>
            <div className="space-y-3">
              {trabajo.repuestos.map((consumo, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {consumo.repuesto?.nombre || 'Repuesto eliminado'}
                    </p>
                    {consumo.repuesto && (
                      <p className="text-sm text-gray-500">
                        {consumo.repuesto.categoria} • {consumo.repuesto.ubicacion}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {consumo.cantidad} {consumo.repuesto?.unidad || ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
}
