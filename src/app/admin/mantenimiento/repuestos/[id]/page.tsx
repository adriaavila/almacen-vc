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

export default function RepuestoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const repuestoId = id as Id<'repuestos'>;
  
  const repuesto = useQuery(api.repuestos.getById, { id: repuestoId });

  const lowStock = repuesto?.status === 'bajo_stock';

  // Loading state
  if (repuesto === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="text-center py-12 text-gray-500">
            <p>Cargando repuesto...</p>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (!repuesto) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="text-center py-12 text-gray-500">
            <p>Repuesto no encontrado</p>
            <Link href="/admin/mantenimiento/repuestos">
              <Button variant="secondary" className="mt-4">
                Volver a Repuestos
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
          <Link href="/admin/mantenimiento/repuestos">
            <Button variant="secondary" className="mb-4">
              ← Volver a Repuestos
            </Button>
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={lowStock ? 'bajo-minimo' : 'ok'}>
                  {lowStock ? 'Bajo Stock' : 'OK'}
                </Badge>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {repuesto.categoria}
                </span>
                {repuesto.marca && (
                  <span className="text-sm text-gray-600">{repuesto.marca}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Repuesto Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Repuesto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Stock Actual</p>
              <p className={`text-2xl font-bold ${lowStock ? 'text-red-600' : 'text-gray-900'}`}>
                {repuesto.stock_actual} {repuesto.unidad}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Stock Mínimo</p>
              <p className="text-base font-medium text-gray-900">
                {repuesto.stock_minimo} {repuesto.unidad}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ubicación</p>
              <p className="text-base font-medium text-gray-900">{repuesto.ubicacion}</p>
            </div>
            {repuesto.descripcion && (
              <div>
                <p className="text-sm text-gray-500">Descripción</p>
                <p className="text-base text-gray-900">{repuesto.descripcion}</p>
              </div>
            )}
            {repuesto.activo_id && (
              <div>
                <p className="text-sm text-gray-500">Activo Específico</p>
                <Link
                  href={`/admin/mantenimiento/activos/${repuesto.activo_id}`}
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  Ver Activo
                </Link>
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
