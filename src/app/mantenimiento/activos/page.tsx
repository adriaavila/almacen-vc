'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function ActivosBasicoPage() {
  const activos = useQuery(api.activos.list);
  const trabajos = useQuery(api.trabajosMantenimiento.list);

  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');

  // Get unique tipos
  const tipos = useMemo(() => {
    if (!activos || activos.length === 0) return [];
    const tiposSet = new Set(activos.map((a) => a.tipo));
    return Array.from(tiposSet);
  }, [activos]);

  // Get last trabajo for each activo
  const activosConTrabajos = useMemo(() => {
    if (!activos || !trabajos) return [];
    
    return activos.map((activo) => {
      const trabajosActivo = trabajos.filter((t) => t.activo_id === activo._id);
      const ultimoTrabajo = trabajosActivo.sort((a, b) => b.createdAt - a.createdAt)[0];
      return {
        ...activo,
        ultimoTrabajo,
      };
    });
  }, [activos, trabajos]);

  // Filter activos
  const filteredActivos = useMemo(() => {
    if (!activosConTrabajos || activosConTrabajos.length === 0) return [];

    let filtered = activosConTrabajos;

    // Filter by estado
    if (estadoFilter !== 'all') {
      filtered = filtered.filter((a) => a.estado === estadoFilter);
    }

    // Filter by tipo
    if (tipoFilter !== 'all') {
      filtered = filtered.filter((a) => a.tipo === tipoFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.nombre.toLowerCase().includes(query) ||
          a.tipo.toLowerCase().includes(query) ||
          a.ubicacion.toLowerCase().includes(query) ||
          (a.descripcion && a.descripcion.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [activosConTrabajos, estadoFilter, tipoFilter, searchQuery]);

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

  // Loading state
  if (activos === undefined || trabajos === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="text-center py-12 text-gray-500">
            <p>Cargando activos...</p>
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Activos</h1>
            <p className="text-sm text-gray-500 mt-1">Consulta de equipos e instalaciones</p>
          </div>
          <Link href="/mantenimiento">
            <Button variant="secondary">← Volver</Button>
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar activos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full h-10 pl-10 pr-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
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
              <option value="operativo">Operativo</option>
              <option value="en_reparacion">En Reparación</option>
              <option value="fuera_servicio">Fuera de Servicio</option>
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
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Activos List */}
        <div className="space-y-3">
          {filteredActivos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No se encontraron activos</p>
            </div>
          ) : (
            filteredActivos.map((activo) => (
              <div
                key={activo._id}
                className={`bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden ${
                  activo.estado === 'operativo'
                    ? 'border-l-4 border-l-emerald-500'
                    : activo.estado === 'en_reparacion'
                    ? 'border-l-4 border-l-yellow-500'
                    : 'border-l-4 border-l-red-500'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {activo.nombre}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {activo.tipo}
                        </span>
                        <Badge variant={getEstadoBadgeVariant(activo.estado)}>
                          {getEstadoLabel(activo.estado)}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Ubicación:</span> {activo.ubicacion}
                      </div>
                      {activo.descripcion && (
                        <p className="text-sm text-gray-600 mb-2">{activo.descripcion}</p>
                      )}
                      {activo.ultimoTrabajo && (
                        <p className="text-xs text-gray-500">
                          Último trabajo: {activo.ultimoTrabajo.descripcion.substring(0, 50)}
                          {activo.ultimoTrabajo.descripcion.length > 50 ? '...' : ''}
                        </p>
                      )}
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
