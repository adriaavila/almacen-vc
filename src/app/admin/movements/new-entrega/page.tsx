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

type ConvexProduct = {
  _id: Id<'products'>;
  name: string;
  brand: string;
  category: string;
  subCategory?: string;
  baseUnit: string;
  purchaseUnit: string;
  conversionFactor: number;
  active: boolean;
  totalStock: number;
  stockAlmacen: number;
  stockCafetin: number;
  status: 'ok' | 'bajo_stock';
};

export default function RegisterEntregaPage() {
  const router = useRouter();
  const registerConsumo = useMutation(api.movements.registerConsumo);
  const registerTraslado = useMutation(api.movements.registerTraslado);

  const [selectedProductId, setSelectedProductId] = useState<Id<'products'> | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ConvexProduct | null>(null);
  const [cantidad, setCantidad] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Auto-focus cantidad input when product is selected
  const cantidadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedProductId && cantidadInputRef.current) {
      cantidadInputRef.current.focus();
    }
  }, [selectedProductId]);

  const handleProductChange = (productId: Id<'products'> | null, product: ConvexProduct | null) => {
    setSelectedProductId(productId);
    setSelectedProduct(product);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!selectedProductId) {
      setToast({
        message: 'Por favor selecciona un producto',
        type: 'error',
      });
      return;
    }

    if (!area) {
      setToast({
        message: 'Por favor selecciona un área',
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
      if (area === 'Cafetin') {
        // Traslado must have different origin and destination
        await registerTraslado({
          productId: selectedProductId,
          from: 'almacen',
          to: 'cafetin',
          quantity: numCantidad,
          user: 'admin',
        });
      } else {
        await registerConsumo({
          productId: selectedProductId,
          location: 'almacen',
          quantity: numCantidad,
          user: 'admin',
          destination: area,
        });
      }

      setToast({
        message: `Entrega registrada: ${numCantidad} ${selectedProduct?.baseUnit || ''} de ${selectedProduct?.name || 'producto'}`,
        type: 'success',
      });

      // Reset form
      setSelectedProductId(null);
      setSelectedProduct(null);
      setCantidad('');
      setArea('');

      // Redirect after short delay
      setTimeout(() => {
        router.push('/admin/movements');
      }, 1500);
    } catch (error: any) {
      console.error('Error al registrar entrega:', error);
      setToast({
        message: error.message || 'No se pudo registrar la entrega. Intente de nuevo.',
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
          <p className="text-sm text-gray-500">
            Registrar entrega o consumo directo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Search */}
          <div>
            <label htmlFor="product-search" className="block text-sm font-medium text-gray-700 mb-2">
              Producto *
            </label>
            <ItemAutocomplete
              value={selectedProductId}
              onChange={handleProductChange}
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
                className="block w-full h-14 text-2xl text-center border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-semibold"
              />
              {selectedProduct && (
                <div className="absolute top-1/2 right-4 transform -translate-y-1/2 text-sm text-gray-500">
                  {selectedProduct.baseUnit}
                </div>
              )}
            </div>
            {selectedProduct && (
              <p className="mt-2 text-sm text-gray-500">
                Stock actual en Almacén: <span className="font-medium">{selectedProduct.stockAlmacen}</span> {selectedProduct.baseUnit}
              </p>
            )}
          </div>

          {/* Area de Destino */}
          <div>
            <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-2">
              Área *
            </label>
            <select
              id="area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
              className="block w-full h-12 px-4 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Selecciona un área...</option>
              <option value="Cocina">Cocina</option>
              <option value="Cafetin">Cafetin</option>
              <option value="Limpieza">Limpieza</option>
              <option value="Las casas">Las casas</option>
              <option value="Mantenimiento">Mantenimiento</option>
              <option value="Otro">Otro (Uso Interno)</option>
            </select>
          </div>

          {/* Submit Button - Desktop */}
          <div className="hidden md:block">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !selectedProductId}
              className="w-full h-14 text-lg bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Entrega'}
            </Button>
          </div>
        </form>
      </PageContainer>

      {/* Sticky Submit Button - Mobile */}
      <div className="md:hidden sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting || !selectedProductId}
          onClick={handleSubmit}
          className="w-full h-14 text-lg bg-red-600 hover:bg-red-700"
        >
          {isSubmitting ? 'Registrando...' : 'Registrar Entrega'}
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
