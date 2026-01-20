'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { ItemAutocomplete } from '@/components/ui/ItemAutocomplete';

export default function RegisterIngresoPage() {
  const router = useRouter();
  const registerIngreso = useMutation(api.stockMovements.registerIngreso);

  const [selectedItemId, setSelectedItemId] = useState<Id<'items'> | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [cantidad, setCantidad] = useState<string>('');
  const [motivo, setMotivo] = useState<'compra' | 'ajuste'>('compra');
  const [referencia, setReferencia] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Auto-focus cantidad input when item is selected
  const cantidadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedItemId && cantidadInputRef.current) {
      cantidadInputRef.current.focus();
    }
  }, [selectedItemId]);

  const handleItemChange = (itemId: Id<'items'> | null, item: any) => {
    setSelectedItemId(itemId);
    setSelectedItem(item);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!selectedItemId) {
      setToast({
        message: 'Por favor selecciona un producto',
        type: 'error',
      });
      return;
    }

    const numCantidad = parseFloat(cantidad);
    if (isNaN(numCantidad) || numCantidad <= 0) {
      setToast({
        message: 'La cantidad debe ser mayor a 0',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await registerIngreso({
        itemId: selectedItemId,
        cantidad: numCantidad,
        motivo,
        referencia: referencia.trim() || undefined,
      });

      setToast({
        message: `Ingreso registrado: ${numCantidad} ${selectedItem?.unidad || ''} de ${selectedItem?.nombre || 'producto'}`,
        type: 'success',
      });

      // Reset form
      setSelectedItemId(null);
      setSelectedItem(null);
      setCantidad('');
      setMotivo('compra');
      setReferencia('');

      // Redirect after short delay (optional)
      setTimeout(() => {
        router.push('/admin/inventario');
      }, 1500);
    } catch (error: any) {
      console.error('Error al registrar ingreso:', error);
      setToast({
        message: error.message || 'No se pudo registrar el ingreso. Intente de nuevo.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={() => router.back()}
            className="mb-4"
          >
            ← Volver
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Registrar Ingreso
          </h1>
          <p className="text-sm text-gray-500">
            Agregar stock al inventario
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Search */}
          <div>
            <label htmlFor="item-search" className="block text-sm font-medium text-gray-700 mb-2">
              Producto *
            </label>
            <ItemAutocomplete
              value={selectedItemId}
              onChange={handleItemChange}
              placeholder="Buscar producto..."
              autoFocus
            />
          </div>

          {/* Cantidad */}
          <div>
            <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad *
            </label>
            <div className="relative">
              <input
                id="cantidad"
                ref={cantidadInputRef}
                type="number"
                min="0.01"
                step="0.01"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0.00"
                required
                className="block w-full h-14 text-2xl text-center border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold"
              />
              {selectedItem && (
                <div className="absolute top-1/2 right-4 transform -translate-y-1/2 text-sm text-gray-500">
                  {selectedItem.unidad}
                </div>
              )}
            </div>
            {selectedItem && (
              <p className="mt-2 text-sm text-gray-500">
                Stock actual: <span className="font-medium">{selectedItem.stock_actual}</span> {selectedItem.unidad}
              </p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="motivo"
                  value="compra"
                  checked={motivo === 'compra'}
                  onChange={(e) => setMotivo(e.target.value as 'compra')}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Compra</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="motivo"
                  value="ajuste"
                  checked={motivo === 'ajuste'}
                  onChange={(e) => setMotivo(e.target.value as 'ajuste')}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Ajuste</span>
              </label>
            </div>
          </div>

          {/* Referencia (opcional) */}
          <div>
            <label htmlFor="referencia" className="block text-sm font-medium text-gray-700 mb-2">
              Referencia <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="referencia"
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Factura, proveedor, etc."
              className="block w-full h-12 px-4 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Submit Button - Desktop */}
          <div className="hidden md:block">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !selectedItemId}
              className="w-full h-14 text-lg"
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Ingreso'}
            </Button>
          </div>
        </form>
      </PageContainer>

      {/* Sticky Submit Button - Mobile */}
      <div className="md:hidden sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || !selectedItemId}
          onClick={handleSubmit}
          className="w-full h-14 text-lg"
        >
          {isSubmitting ? 'Registrando...' : 'Registrar Ingreso'}
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isOpen={!!toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
