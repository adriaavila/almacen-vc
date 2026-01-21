'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function TrabajosPage() {
  const trabajos = useQuery(api.trabajosMantenimiento.list);

  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');

  // Filter trabajos
  const filteredTrabajos = useMemo(() => {
    if (!trabajos || trabajos.length === 0) return [];

    let filtered = trabajos;

    // Filter by estado
    if (estadoFilter !== 'all') {
      filtered = filtered.filter((t) => t.estado === estadoFilter);
    }

    // Filter by tipo
    if (tipoFilter !== 'all') {
      filtered = filtered.filter((t) => t.tipo === tipoFilter);
    }

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [trabajos, estadoFilter, tipoFilter]);

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

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  // Loading state
  if (trabajos === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="text-center py-12 text-gray-500">
            <p>Cargando trabajos...</p>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <div className="mb-6 flex items-center justify-between">
          <div></div>
          <div className="flex gap-3">
            <Link href="/admin/mantenimiento">
              <Button variant="secondary">← Volver</Button>
            </Link>
            <Link href="/admin/mantenimiento/trabajos/new">
              <Button variant="primary">Nuevo Trabajo</Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En Proceso</option>
              <option value="completado">Completado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todos</option>
              <option value="preventivo">Preventivo</option>
              <option value="correctivo">Correctivo</option>
              <option value="emergencia">Emergencia</option>
            </select>
          </div>
        </div>

        {/* Trabajos List */}
        <div className="space-y-3">
          {filteredTrabajos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No se encontraron trabajos</p>
            </div>
          ) : (
            filteredTrabajos.map((trabajo) => (
              <div
                key={trabajo._id}
                className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/admin/mantenimiento/trabajos/${trabajo._id}`}>
                        <h3 className="text-lg font-semibold text-emerald-600 hover:text-emerald-800 mb-1 cursor-pointer">
                          {trabajo.activo?.nombre || 'Activo eliminado'}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge variant={trabajo.tipo === 'emergencia' ? 'bajo-minimo' : 'ok'}>
                          {getTipoLabel(trabajo.tipo)}
                        </Badge>
                        <Badge variant={trabajo.estado === 'completado' ? 'ok' : 'bajo-minimo'}>
                          {getEstadoLabel(trabajo.estado)}
                        </Badge>
                        <span className="text-xs text-gray-500">{formatDate(trabajo.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-900 mb-2">{trabajo.descripcion}</p>
                      {trabajo.tecnico && (
                        <p className="text-xs text-gray-500">Técnico: {trabajo.tecnico}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Link href={`/admin/mantenimiento/trabajos/${trabajo._id}`}>
                        <Button variant="primary" className="text-xs px-3 py-1 h-auto">
                          Ver Detalle
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PageContainer>
    </div>
  );
}
