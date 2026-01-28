'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { RequesterHeader } from '@/components/requester/RequesterHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

type ConvexProduct = {
  _id: Id<"products">;
  name: string;
  brand: string;
  category: string;
  subCategory?: string;
  baseUnit: string;
  purchaseUnit: string;
  conversionFactor: number;
  active: boolean;
  availableForSale?: boolean;
  totalStock: number;
  stockAlmacen: number;
  stockCafetin: number;
  status: "ok" | "bajo_stock";
};

export default function ProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as Id<'products'>;

  const product = useQuery(api.products.getWithInventory, productId ? { id: productId } : 'skip');
  const updateProduct = useMutation(api.products.update);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: '',
    subCategory: '',
    baseUnit: '',
    purchaseUnit: '',
    conversionFactor: 1,
    active: true,
    availableForSale: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
  }>({
    message: '',
    type: 'info',
    isOpen: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when product loads
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        brand: product.brand || '',
        category: product.category || '',
        subCategory: product.subCategory || '',
        baseUnit: product.baseUnit || '',
        purchaseUnit: product.purchaseUnit || '',
        conversionFactor: product.conversionFactor || 1,
        active: product.active ?? true,
        availableForSale: product.availableForSale ?? true,
      });
    }
  }, [product]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'La categoría es requerida';
    }

    if (!formData.baseUnit.trim()) {
      newErrors.baseUnit = 'La unidad base es requerida';
    }

    if (!formData.purchaseUnit.trim()) {
      newErrors.purchaseUnit = 'La unidad de compra es requerida';
    }

    if (formData.conversionFactor <= 0 || isNaN(formData.conversionFactor)) {
      newErrors.conversionFactor = 'El factor de conversión debe ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!productId || !product) return;

    if (!validateForm()) {
      setToast({
        message: 'Por favor corrige los errores en el formulario',
        type: 'error',
        isOpen: true,
      });
      return;
    }

    setIsSaving(true);

    try {
      await updateProduct({
        id: productId,
        name: formData.name.trim(),
        brand: formData.brand.trim() || '',
        category: formData.category.trim(),
        subCategory: formData.subCategory.trim() || undefined,
        baseUnit: formData.baseUnit.trim(),
        purchaseUnit: formData.purchaseUnit.trim(),
        conversionFactor: formData.conversionFactor,
        active: formData.active,
        availableForSale: formData.availableForSale,
      });

      setToast({
        message: 'Producto actualizado correctamente',
        type: 'success',
        isOpen: true,
      });

      // Navigate back after a short delay
      setTimeout(() => {
        router.push('/requester/stock');
      }, 1000);
    } catch (error: any) {
      console.error('Error al actualizar producto:', error);
      setToast({
        message: error.message || 'Error al actualizar producto. Intente de nuevo.',
        type: 'error',
        isOpen: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/requester/stock');
  };

  // Loading state
  if (product === undefined) {
    return (
      <PageContainer>
        <RequesterHeader 
          title="Editar Producto"
          subtitle="Cargando..."
        />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Cargando producto...</p>
        </div>
      </PageContainer>
    );
  }

  // Error state - product not found
  if (product === null) {
    return (
      <PageContainer>
        <RequesterHeader 
          title="Editar Producto"
          subtitle="Producto no encontrado"
        />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <p className="text-red-600 mb-4">Producto no encontrado</p>
          <Button
            variant="secondary"
            onClick={() => router.push('/requester/stock')}
          >
            Volver a stock
          </Button>
        </div>
      </PageContainer>
    );
  }

  const cafetinInventory = product.inventory?.find(inv => inv.location === 'cafetin');
  const cafetinStock = cafetinInventory?.stockActual || 0;
  // Calculate status from inventory data
  const totalStock = product.totalStock || 0;
  const totalMinStock = product.inventory?.reduce((sum, inv) => sum + inv.stockMinimo, 0) || 0;
  const isLowStock = totalStock <= totalMinStock;

  return (
    <>
      <PageContainer>
        <RequesterHeader 
          title="Editar Producto"
          subtitle={product.name}
        />

        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={handleCancel}
            className="mb-4"
          >
            ← Volver a stock
          </Button>
        </div>

        {/* Product Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Información del Producto</h2>

          <div className="space-y-6">
            {/* Basic Information Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información Básica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Nombre <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="Ej: Coca Cola 350ml"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="brand" className="text-sm font-medium text-gray-700">
                    Marca
                  </Label>
                  <Input
                    id="brand"
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="mt-1"
                    placeholder="Ej: Coca Cola"
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                    Categoría <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="category"
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`mt-1 ${errors.category ? 'border-red-500' : ''}`}
                    placeholder="Ej: Bebidas"
                  />
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="subCategory" className="text-sm font-medium text-gray-700">
                    Subcategoría
                  </Label>
                  <Input
                    id="subCategory"
                    type="text"
                    value={formData.subCategory}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    className="mt-1"
                    placeholder="Ej: Gaseosas"
                  />
                </div>
              </div>
            </div>

            {/* Units & Conversion Section */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Unidades y Conversión</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="baseUnit" className="text-sm font-medium text-gray-700">
                    Unidad Base <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="baseUnit"
                    type="text"
                    value={formData.baseUnit}
                    onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                    className={`mt-1 ${errors.baseUnit ? 'border-red-500' : ''}`}
                    placeholder="Ej: unidad, ml, gr"
                  />
                  {errors.baseUnit && (
                    <p className="mt-1 text-sm text-red-600">{errors.baseUnit}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="purchaseUnit" className="text-sm font-medium text-gray-700">
                    Unidad de Compra <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="purchaseUnit"
                    type="text"
                    value={formData.purchaseUnit}
                    onChange={(e) => setFormData({ ...formData, purchaseUnit: e.target.value })}
                    className={`mt-1 ${errors.purchaseUnit ? 'border-red-500' : ''}`}
                    placeholder="Ej: caja, fardo, saco"
                  />
                  {errors.purchaseUnit && (
                    <p className="mt-1 text-sm text-red-600">{errors.purchaseUnit}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="conversionFactor" className="text-sm font-medium text-gray-700">
                    Factor de Conversión <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="conversionFactor"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.conversionFactor}
                    onChange={(e) => setFormData({ ...formData, conversionFactor: parseFloat(e.target.value) || 1 })}
                    className={`mt-1 ${errors.conversionFactor ? 'border-red-500' : ''}`}
                    placeholder="Ej: 24"
                  />
                  {errors.conversionFactor && (
                    <p className="mt-1 text-sm text-red-600">{errors.conversionFactor}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Cuántas {formData.baseUnit || 'unidades base'} hay en una {formData.purchaseUnit || 'unidad de compra'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status & Availability Section */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Estado y Disponibilidad</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="active" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Producto Activo
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Los productos inactivos no aparecerán en las listas
                    </p>
                  </div>
                  <Checkbox
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked === true })}
                    className="ml-4"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="availableForSale" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Disponible para Venta en POS
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Los productos no disponibles no aparecerán en el punto de venta
                    </p>
                  </div>
                  <Checkbox
                    id="availableForSale"
                    checked={formData.availableForSale}
                    onCheckedChange={(checked) => setFormData({ ...formData, availableForSale: checked === true })}
                    className="ml-4"
                  />
                </div>
              </div>
            </div>

            {/* Stock Information (Read-only) */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información de Stock</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      isLowStock ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                  ></div>
                  <Badge variant={isLowStock ? 'bajo-minimo' : 'ok'}>
                    {isLowStock ? 'Bajo Stock' : 'OK'}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Stock Cafetín
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {cafetinStock}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {product.baseUnit}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Stock Total
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {product.totalStock || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {product.baseUnit}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </PageContainer>

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </>
  );
}
