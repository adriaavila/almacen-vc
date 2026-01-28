'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const productId = params?.id as Id<'products'>;
  const editMode = searchParams?.get('edit') === 'true';

  const product = useQuery(api.products.getWithInventory, productId ? { id: productId } : 'skip');
  const movements = useQuery(
    api.movements.getByProduct,
    productId ? { productId, limit: 20 } : 'skip'
  );
  
  const updateProduct = useMutation(api.products.update);
  const setMinStock = useMutation(api.inventory.setMinStock);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: '',
    subCategory: '',
    baseUnit: '',
    purchaseUnit: '',
    conversionFactor: 1,
    active: true,
    stockMinimo: 0,
  });
  
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
  }>({
    message: '',
    type: 'info',
    isOpen: false,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize form data when product loads
  useEffect(() => {
    if (product && editMode) {
      const almacenInventory = product.inventory?.find(inv => inv.location === 'almacen');
      setFormData({
        name: product.name || '',
        brand: product.brand || '',
        category: product.category || '',
        subCategory: product.subCategory || '',
        baseUnit: product.baseUnit || '',
        purchaseUnit: product.purchaseUnit || '',
        conversionFactor: product.conversionFactor || 1,
        active: product.active ?? true,
        stockMinimo: almacenInventory?.stockMinimo || 0,
      });
    }
  }, [product, editMode]);

  const formatShortDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  // Build return URL preserving filters
  const getReturnUrl = () => {
    const category = searchParams?.get('category');
    const status = searchParams?.get('status');
    const search = searchParams?.get('search');
    let url = '/admin/inventario';
    const params = [];
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (status) params.push(`status=${status}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (params.length > 0) url += '?' + params.join('&');
    return url;
  };
  
  const handleSave = async () => {
    if (!productId) return;
    
    // Validation
    if (!formData.name.trim()) {
      setToast({
        message: 'El nombre es requerido',
        type: 'error',
        isOpen: true,
      });
      return;
    }
    if (!formData.category.trim()) {
      setToast({
        message: 'La categoría es requerida',
        type: 'error',
        isOpen: true,
      });
      return;
    }
    if (!formData.baseUnit.trim()) {
      setToast({
        message: 'La unidad base es requerida',
        type: 'error',
        isOpen: true,
      });
      return;
    }
    if (!formData.purchaseUnit.trim()) {
      setToast({
        message: 'La unidad de compra es requerida',
        type: 'error',
        isOpen: true,
      });
      return;
    }
    if (formData.conversionFactor <= 0) {
      setToast({
        message: 'El factor de conversión debe ser mayor a 0',
        type: 'error',
        isOpen: true,
      });
      return;
    }
    if (formData.stockMinimo < 0) {
      setToast({
        message: 'El stock mínimo no puede ser negativo',
        type: 'error',
        isOpen: true,
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // Update product
      await updateProduct({
        id: productId,
        name: formData.name.trim(),
        brand: formData.brand.trim() || undefined,
        category: formData.category.trim(),
        subCategory: formData.subCategory.trim() || undefined,
        baseUnit: formData.baseUnit.trim(),
        purchaseUnit: formData.purchaseUnit.trim(),
        conversionFactor: formData.conversionFactor,
        active: formData.active,
      });
      
      // Update stock mínimo
      await setMinStock({
        productId,
        location: 'almacen',
        stockMinimo: formData.stockMinimo,
      });
      
      setToast({
        message: 'Producto actualizado correctamente',
        type: 'success',
        isOpen: true,
      });
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.push(getReturnUrl());
      }, 1000);
    } catch (error: any) {
      console.error('Error al guardar producto:', error);
      setToast({
        message: error.message || 'Error al guardar producto. Intente de nuevo.',
        type: 'error',
        isOpen: true,
      });
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    router.push(getReturnUrl());
  };
  
  // Get movement display info
  const getMovementInfo = (type: string) => {
    switch (type) {
      case 'COMPRA':
        return { label: 'Compra', isPositive: true, color: 'emerald' };
      case 'TRASLADO':
        return { label: 'Traslado', isPositive: false, color: 'blue' };
      case 'CONSUMO':
        return { label: 'Consumo', isPositive: false, color: 'red' };
      case 'AJUSTE':
        return { label: 'Ajuste', isPositive: true, color: 'yellow' };
      default:
        return { label: type, isPositive: false, color: 'gray' };
    }
  };

  // Loading state
  if (product === undefined || movements === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Cargando...</p>
          </div>
        </PageContainer>
      </div>
    );
  }

  // Error state - product not found
  if (product === null) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <PageContainer>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <p className="text-red-600 mb-4">Producto no encontrado</p>
            <Button
              variant="secondary"
              onClick={() => router.push('/admin/inventario')}
            >
              Volver a inventario
            </Button>
          </div>
        </PageContainer>
      </div>
    );
  }

  // Calculate total stock and low stock status
  const almacenInventory = product.inventory?.find(inv => inv.location === 'almacen');
  const cafetinInventory = product.inventory?.find(inv => inv.location === 'cafetin');
  const totalStock = product.totalStock || 0;
  const almacenStock = almacenInventory?.stockActual || 0;
  const almacenMin = almacenInventory?.stockMinimo || 0;
  const cafetinStock = cafetinInventory?.stockActual || 0;
  const isLowStock = totalStock <= almacenMin;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PageContainer>
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={handleCancel}
            className="mb-4"
          >
            ← Volver a inventario
          </Button>
          {editMode && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-800 font-medium">Modo Edición</p>
            </div>
          )}
        </div>

        {/* Header with Stock */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">{product.name}</h1>
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
              
              {/* Stock by Location */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Stock Almacén
                  </p>
                  <p
                    className={`text-4xl font-bold ${
                      almacenStock <= almacenMin ? 'text-red-600' : 'text-gray-900'
                    }`}
                  >
                    {almacenStock}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {product.baseUnit} (mín: {almacenMin})
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Stock Cafetín
                  </p>
                  <p className="text-4xl font-bold text-gray-900">
                    {cafetinStock}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {product.baseUnit}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              onClick={() => router.push('/admin/movements/new')}
              className="h-12"
            >
              Registrar Ingreso
            </Button>
          </div>

          {/* Product Information */}
          {editMode ? (
            <div className="space-y-6 pt-6 border-t border-gray-200">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                      Marca
                    </label>
                    <input
                      id="brand"
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="category"
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="subCategory" className="block text-sm font-medium text-gray-700 mb-1">
                      Subcategoría
                    </label>
                    <input
                      id="subCategory"
                      type="text"
                      value={formData.subCategory}
                      onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
              
              {/* Units & Conversion */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Unidades y Conversión</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="baseUnit" className="block text-sm font-medium text-gray-700 mb-1">
                      Unidad Base <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="baseUnit"
                      type="text"
                      value={formData.baseUnit}
                      onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="purchaseUnit" className="block text-sm font-medium text-gray-700 mb-1">
                      Unidad de Compra <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="purchaseUnit"
                      type="text"
                      value={formData.purchaseUnit}
                      onChange={(e) => setFormData({ ...formData, purchaseUnit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="conversionFactor" className="block text-sm font-medium text-gray-700 mb-1">
                      Factor de Conversión <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="conversionFactor"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={formData.conversionFactor}
                      onChange={(e) => setFormData({ ...formData, conversionFactor: parseFloat(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>
              </div>
              
              {/* Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado</h3>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Activo</span>
                  </label>
                </div>
              </div>
              
              {/* Stock Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-500 mb-1">Stock Almacén (actual)</p>
                    <p className="text-2xl font-bold text-gray-900">{almacenStock}</p>
                    <p className="text-xs text-gray-500 mt-1">{product.baseUnit}</p>
                  </div>
                  <div>
                    <label htmlFor="stockMinimo" className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Mínimo (Almacén) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="stockMinimo"
                      type="number"
                      min="0"
                      step="1"
                      value={formData.stockMinimo}
                      onChange={(e) => setFormData({ ...formData, stockMinimo: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Alerta cuando el stock esté por debajo de este valor</p>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Categoría</p>
                <p className="text-base text-gray-900">
                  {product.category}
                  {product.subCategory && ` • ${product.subCategory}`}
                </p>
              </div>
              {product.brand && product.brand !== '' && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Marca</p>
                  <p className="text-base text-gray-900">{product.brand}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Unidad Base</p>
                <p className="text-base text-gray-900">{product.baseUnit}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Unidad de Compra</p>
                <p className="text-base text-gray-900">
                  {product.purchaseUnit} ({product.conversionFactor} {product.baseUnit})
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Estado</p>
                <p className="text-base text-gray-900">
                  {product.active ? 'Activo' : 'Inactivo'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Movements */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Últimos Movimientos
            </h2>
          </div>

          {!movements || movements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No hay movimientos registrados para este producto</p>
            </div>
          ) : (
            <div className="space-y-3">
              {movements.map((movement) => {
                const info = getMovementInfo(movement.type);
                const isPositive = movement.type === 'COMPRA' || 
                  (movement.type === 'AJUSTE' && movement.nextStock > movement.prevStock);
                
                return (
                  <div
                    key={movement._id}
                    className={`flex items-center justify-between p-4 rounded-md border ${
                      isPositive
                        ? 'bg-emerald-50 border-emerald-200'
                        : movement.type === 'TRASLADO'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          isPositive
                            ? 'bg-emerald-500 text-white'
                            : movement.type === 'TRASLADO'
                            ? 'bg-blue-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {isPositive ? (
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        ) : movement.type === 'TRASLADO' ? (
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 12H4"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {info.label}
                          </p>
                          {movement.from && (
                            <span className="text-xs text-gray-500">
                              {movement.from} → {movement.to}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatShortDate(movement.timestamp)} • {movement.user}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p
                        className={`text-lg font-bold ${
                          isPositive ? 'text-emerald-700' : 
                          movement.type === 'TRASLADO' ? 'text-blue-700' : 'text-red-700'
                        }`}
                      >
                        {isPositive ? '+' : '-'}
                        {movement.quantity}
                      </p>
                      <p className="text-xs text-gray-500">{product.baseUnit}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Toast */}
        <Toast
          message={toast.message}
          type={toast.type}
          isOpen={toast.isOpen}
          onClose={() => setToast({ ...toast, isOpen: false })}
        />
      </PageContainer>
    </div>
  );
}
