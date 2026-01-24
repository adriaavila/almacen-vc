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
  packageSize: number;
  active: boolean;
  totalStock: number;
  stockAlmacen: number;
  stockCafetin: number;
  status: 'ok' | 'bajo_stock';
};

export default function RegisterIngresoPage() {
  const router = useRouter();
  const registerCompra = useMutation(api.movements.registerCompra);
  const registerAjuste = useMutation(api.movements.registerAjuste);

  const [selectedProductId, setSelectedProductId] = useState<Id<'products'> | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ConvexProduct | null>(null);
  const [cantidad, setCantidad] = useState<string>('');
  const [motivo, setMotivo] = useState<'compra' | 'ajuste'>('compra');
  const [referencia, setReferencia] = useState<string>('');
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
      if (motivo === 'compra') {
        await registerCompra({
          productId: selectedProductId,
          location: 'almacen',
          quantity: numCantidad,
          user: 'admin',
        });
      } else {
        // For ajuste, we add the quantity to existing stock
        const newStock = (selectedProduct?.stockAlmacen || 0) + numCantidad;
        await registerAjuste({
          productId: selectedProductId,
          location: 'almacen',
          newStock: newStock,
          user: 'admin',
          reason: referencia.trim() || 'Ajuste de inventario',
        });
      }

      setToast({
        message: `Ingreso registrado: ${numCantidad} ${selectedProduct?.baseUnit || ''} de ${selectedProduct?.name || 'producto'}`,
        type: 'success',
      });

      // Reset form
      setSelectedProductId(null);
      setSelectedProduct(null);
      setCantidad('');
      setMotivo('compra');
      setReferencia('');

      // Redirect after short delay
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
          <p className="text-sm text-gray-500">
            Agregar stock al inventario
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
                className="block w-full h-14 text-2xl text-center border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold"
              />
              {selectedProduct && (
                <div className="absolute top-1/2 right-4 transform -translate-y-1/2 text-sm text-gray-500">
                  {selectedProduct.baseUnit}
                </div>
              )}
            </div>
            {selectedProduct && (
              <p className="mt-2 text-sm text-gray-500">
                Stock actual (Almacén): <span className="font-medium">{selectedProduct.stockAlmacen}</span> {selectedProduct.baseUnit}
              </p>
            )}
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo *
            </label>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="motivo"
                  value="compra"
                  checked={motivo === 'compra'}
                  onChange={(e) => setMotivo(e.target.value as 'compra' | 'ajuste')}
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
                  onChange={(e) => setMotivo(e.target.value as 'compra' | 'ajuste')}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Ajuste</span>
              </label>
            </div>
          </div>

          {/* Referencia (opcional for compra, required for ajuste) */}
          <div>
            <label htmlFor="referencia" className="block text-sm font-medium text-gray-700 mb-2">
              {motivo === 'ajuste' ? 'Razón del ajuste *' : 'Referencia'}{' '}
              {motivo !== 'ajuste' && <span className="text-gray-400 font-normal">(opcional)</span>}
            </label>
            <input
              id="referencia"
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder={motivo === 'ajuste' ? 'Explica el ajuste...' : 'Factura, proveedor, etc.'}
              required={motivo === 'ajuste'}
              className="block w-full h-12 px-4 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Submit Button - Desktop */}
          <div className="hidden md:block">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !selectedProductId}
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
          disabled={isSubmitting || !selectedProductId}
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
