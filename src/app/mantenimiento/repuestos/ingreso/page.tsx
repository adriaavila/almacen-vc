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
import { RepuestoAutocomplete } from '@/components/ui/RepuestoAutocomplete';

export default function RegisterRepuestoIngresoPage() {
  const router = useRouter();
  const incrementStock = useMutation(api.repuestos.incrementStock);

  const [selectedRepuestoId, setSelectedRepuestoId] = useState<Id<'repuestos'> | null>(null);
  const [selectedRepuesto, setSelectedRepuesto] = useState<any>(null);
  const [cantidad, setCantidad] = useState<string>('');
  const [referencia, setReferencia] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Auto-focus cantidad input when repuesto is selected
  const cantidadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedRepuestoId && cantidadInputRef.current) {
      cantidadInputRef.current.focus();
    }
  }, [selectedRepuestoId]);

  const handleRepuestoChange = (repuestoId: Id<'repuestos'> | null, repuesto: any) => {
    setSelectedRepuestoId(repuestoId);
    setSelectedRepuesto(repuesto);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!selectedRepuestoId) {
      setToast({
        message: 'Por favor selecciona un repuesto',
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
      await incrementStock({
        id: selectedRepuestoId,
        cantidad: numCantidad,
      });

      setToast({
        message: `Ingreso registrado: ${numCantidad} ${selectedRepuesto?.unidad || ''} de ${selectedRepuesto?.nombre || 'repuesto'}`,
        type: 'success',
      });

      // Reset form
      setSelectedRepuestoId(null);
      setSelectedRepuesto(null);
      setCantidad('');
      setReferencia('');

      // Redirect after short delay
      setTimeout(() => {
        router.push('/mantenimiento/repuestos');
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Registrar Ingreso de Repuesto
          </h1>
          <p className="text-sm text-gray-500">
            Agregar stock de repuestos al inventario de mantenimiento
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Repuesto Search */}
          <div>
            <label htmlFor="repuesto-search" className="block text-sm font-medium text-gray-700 mb-2">
              Repuesto *
            </label>
            <RepuestoAutocomplete
              value={selectedRepuestoId}
              onChange={handleRepuestoChange}
              placeholder="Buscar repuesto..."
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
              {selectedRepuesto && (
                <div className="absolute top-1/2 right-4 transform -translate-y-1/2 text-sm text-gray-500">
                  {selectedRepuesto.unidad}
                </div>
              )}
            </div>
            {selectedRepuesto && (
              <p className="mt-2 text-sm text-gray-500">
                Stock actual: <span className="font-medium">{selectedRepuesto.stock_actual}</span> {selectedRepuesto.unidad}
              </p>
            )}
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
              placeholder="Proveedor, factura, etc."
              className="block w-full h-12 px-4 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Submit Button - Desktop */}
          <div className="hidden md:block">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !selectedRepuestoId}
              className="w-full h-14 text-lg"
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Ingreso'}
            </Button>
          </div>
        </form>

        {/* Sticky Submit Button - Mobile */}
        <div className="md:hidden sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !selectedRepuestoId}
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
      </PageContainer>
    </div>
  );
}
