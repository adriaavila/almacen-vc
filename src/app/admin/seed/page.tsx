'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';

export default function SeedPage() {
  const clearAllMutation = useMutation(api.seed.clearAll);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Administración de Base de Datos</h1>
          <p className="text-sm text-gray-500">
            Utiliza esta página para gestionar la base de datos.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          {message && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 whitespace-pre-line">
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
              <h2 className="text-lg font-semibold text-red-600 mb-2">
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
