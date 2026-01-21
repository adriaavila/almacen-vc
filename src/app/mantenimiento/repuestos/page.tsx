'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function RepuestosBasicoPage() {
  const repuestos = useQuery(api.repuestos.list);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Get unique categorias
  const categorias = useMemo(() => {
    if (!repuestos || repuestos.length === 0) return [];
    const catsSet = new Set(repuestos.map((r) => r.categoria));
    return Array.from(catsSet);
  }, [repuestos]);

  // Filter repuestos
  const filteredRepuestos = useMemo(() => {
    if (!repuestos || repuestos.length === 0) return [];

    let filtered = repuestos;

    // Filter by categoria
    if (categoriaFilter !== 'all') {
      filtered = filtered.filter((r) => r.categoria === categoriaFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.nombre.toLowerCase().includes(query) ||
          r.categoria.toLowerCase().includes(query) ||
          (r.marca && r.marca.toLowerCase().includes(query)) ||
          (r.descripcion && r.descripcion.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [repuestos, categoriaFilter, statusFilter, searchQuery]);

  // Loading state
  if (repuestos === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="text-center py-12 text-gray-500">
            <p>Cargando repuestos...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Repuestos</h1>
            <p className="text-sm text-gray-500 mt-1">Consulta de repuestos para mantenimiento</p>
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
              placeholder="Buscar repuestos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full h-10 pl-10 pr-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todas</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todos</option>
              <option value="ok">OK</option>
              <option value="bajo_stock">Bajo Stock</option>
            </select>
          </div>
        </div>

        {/* Repuestos List */}
        <div className="space-y-3">
          {filteredRepuestos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No se encontraron repuestos</p>
            </div>
          ) : (
            filteredRepuestos.map((repuesto) => {
              const lowStock = repuesto.status === 'bajo_stock';
              return (
                <div
                  key={repuesto._id}
                  className={`bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden ${
                    lowStock ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-emerald-500'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {repuesto.nombre}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {repuesto.categoria}
                          </span>
                          {repuesto.marca && (
                            <span className="text-xs text-gray-500">{repuesto.marca}</span>
                          )}
                          <Badge variant={lowStock ? 'bajo-minimo' : 'ok'}>
                            {lowStock ? 'Bajo Stock' : 'OK'}
                          </Badge>
                        </div>
                        {repuesto.descripcion && (
                          <p className="text-sm text-gray-600 mb-2">{repuesto.descripcion}</p>
                        )}
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Ubicación:</span> {repuesto.ubicacion}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs uppercase text-gray-500 font-medium">Stock Actual</span>
                          <span className={`text-2xl font-bold ${lowStock ? 'text-red-600' : 'text-gray-900'}`}>
                            {repuesto.stock_actual}
                          </span>
                          <span className="text-sm text-gray-500">/ {repuesto.stock_minimo} mín</span>
                          <span className="text-sm text-gray-500">{repuesto.unidad}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PageContainer>
    </div>
  );
}
