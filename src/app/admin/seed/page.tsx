'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { seedItems } from '@/data/transformed-stock';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';

export default function SeedPage() {
  const seedItemsMutation = useMutation(api.seed.seedItems);
  const clearAllMutation = useMutation(api.seed.clearAll);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Transformar los datos para Convex
  const transformItemsForConvex = () => {
    return seedItems.map(item => ({
      nombre: item.nombre,
      categoria: item.categoria,
      subcategoria: item.subcategoria,
      marca: item.marca,
      unidad: item.unidad,
      stock_actual: item.stock_actual,
      stock_minimo: item.stock_minimo,
      package_size: item.package_size,
      location: item.location,
      extra_notes: item.extra_notes,
    }));
  };

  const handleSeed = async () => {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const items = transformItemsForConvex();
      const result = await seedItemsMutation({ items });
      
      if (result.success) {
        setMessage(`✅ ${result.message}`);
      } else {
        setError(`⚠️ ${result.message}. ${result.existingCount ? `Hay ${result.existingCount} items existentes.` : ''}`);
      }
    } catch (err: any) {
      setError(`❌ Error: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const result = await clearAllMutation();
      setMessage(`✅ ${result.message}. Eliminados: ${result.deleted.items} items, ${result.deleted.orders} pedidos, ${result.deleted.orderItems} orderItems.`);
    } catch (err: any) {
      setError(`❌ Error: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cargar Datos Iniciales</h1>
          <p className="text-sm text-gray-500">
            Utiliza esta página para cargar los datos de inventario iniciales en Convex.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          {message && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800">
              {message}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Cargar Items ({seedItems.length} items)
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Carga todos los items del inventario desde <code className="bg-gray-100 px-1 rounded">src/data/transformed-stock.ts</code>
              </p>
              <Button
                onClick={handleSeed}
                disabled={loading}
                variant="primary"
              >
                {loading ? 'Cargando...' : 'Cargar Items'}
              </Button>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 text-red-600">
                ⚠️ Limpiar Base de Datos
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Elimina todos los datos (items, pedidos, orderItems). Úsalo solo si necesitas empezar de cero.
              </p>
              <Button
                onClick={handleClearAll}
                disabled={loading}
                variant="secondary"
                className="bg-red-50 text-red-700 hover:bg-red-100 border-red-300"
              >
                {loading ? 'Eliminando...' : 'Limpiar Todo'}
              </Button>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
