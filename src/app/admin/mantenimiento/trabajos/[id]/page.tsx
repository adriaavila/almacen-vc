'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { useState } from 'react';

export default function TrabajoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const trabajoId = id as Id<'trabajos_mantenimiento'>;
  
  const trabajo = useQuery(api.trabajosMantenimiento.getById, { id: trabajoId });
  const completarTrabajo = useMutation(api.trabajosMantenimiento.completar);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

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

  const handleCompletar = async () => {
    if (!trabajo) return;

    setIsCompleting(true);
    try {
      await completarTrabajo({
        id: trabajoId,
        nuevoEstadoActivo: 'operativo',
      });

      setToast({
        message: 'Trabajo completado exitosamente',
        type: 'success',
      });

      // Reload page data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Error al completar trabajo:', error);
      setToast({
        message: error.message || 'No se pudo completar el trabajo. Intente de nuevo.',
        type: 'error',
      });
    } finally {
      setIsCompleting(false);
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
            <Link href="/admin/mantenimiento/trabajos">
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
          <Link href="/admin/mantenimiento/trabajos">
            <Button variant="secondary" className="mb-4">
              ← Volver a Trabajos
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
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
            {trabajo.estado !== 'completado' && (
              <Button
                variant="primary"
                onClick={handleCompletar}
                disabled={isCompleting}
              >
                {isCompleting ? 'Completando...' : 'Marcar como Completado'}
              </Button>
            )}
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
                <Link
                  href={`/admin/mantenimiento/activos/${trabajo.activo._id}`}
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  {trabajo.activo.nombre}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Repuestos Consumidos */}
        {trabajo.repuestos && trabajo.repuestos.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Repuestos Consumidos</h2>
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

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            isOpen={!!toast}
            onClose={() => setToast(null)}
          />
        )}
      </PageContainer>
    </div>
  );
}
