'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { Modal } from './Modal';
import { Button } from './Button';
import { Toast } from './Toast';
import { ConfirmationModal } from './ConfirmationModal';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: Id<'products'> | null;
  onProductUpdated?: () => void;
  onProductDeleted?: () => void;
  location?: 'almacen' | 'cafetin';
}

const BASE_UNITS = ['Unidad', 'Litro', 'Kg', 'Gr', 'Pieza'];
const PURCHASE_UNITS = ['Caja', 'Fardo', 'Saco', 'Paquete', 'Unidad', 'Kg'];

type ProductWithInventory = {
  _id: Id<'products'>;
  name: string;
  brand: string;
  category: string;
  subCategory?: string;
  baseUnit: string;
  purchaseUnit: string;
  conversionFactor: number;
  active: boolean;
  inventory?: Array<{
    location: string;
    stockActual: number;
    stockMinimo: number;
  }>;
  isNonStocking?: boolean;
};

export function EditProductModal({ isOpen, onClose, productId, onProductUpdated, onProductDeleted, location = 'almacen' }: EditProductModalProps) {
  const product = useQuery(
    api.products.getWithInventory,
    productId && isOpen ? { id: productId } : 'skip'
  ) as ProductWithInventory | undefined;

  const createProduct = useMutation(api.products.create);
  const initializeInventory = useMutation(api.inventory.initialize);
  const updateProduct = useMutation(api.products.update);
  const deleteProduct = useMutation(api.products.deleteProduct);
  const setMinStock = useMutation(api.inventory.setMinStock);
  const categories = useQuery(api.products.getCategories);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [subCategory, setSubCategory] = useState('');
  const [baseUnit, setBaseUnit] = useState('');
  const [baseUnitInput, setBaseUnitInput] = useState('');
  const [useCustomBaseUnit, setUseCustomBaseUnit] = useState(false);
  const [purchaseUnit, setPurchaseUnit] = useState('');
  const [purchaseUnitInput, setPurchaseUnitInput] = useState('');
  const [useCustomPurchaseUnit, setUseCustomPurchaseUnit] = useState(false);
  const [conversionFactor, setConversionFactor] = useState<string>('1');
  const [stockMinimo, setStockMinimo] = useState<string>('0');
  const [active, setActive] = useState(true);
  const [isNonStocking, setIsNonStocking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
  }>({
    message: '',
    type: 'info',
    isOpen: false,
  });

  // Initialize form when product loads (only when loaded product matches requested productId to avoid stale data)
  useEffect(() => {
    if (product && isOpen && productId && product._id === productId) {
      const inventory = product.inventory?.find(inv => inv.location === location);

      setName(product.name || '');
      setBrand(product.brand || '');
      setCategory(product.category || '');
      setCategoryInput('');
      setUseCustomCategory(false);
      setSubCategory(product.subCategory || '');
      setBaseUnit(product.baseUnit || '');
      setBaseUnitInput('');
      setUseCustomBaseUnit(false);
      setPurchaseUnit(product.purchaseUnit || '');
      setPurchaseUnitInput('');
      setUseCustomPurchaseUnit(false);
      setConversionFactor(String(product.conversionFactor || 1));
      setStockMinimo(String(inventory?.stockMinimo || 0));
      setActive(product.active ?? true);
      setIsNonStocking(product.isNonStocking ?? false);
      setError(null);
    }
  }, [product, isOpen, location, productId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setBrand('');
      setCategory('');
      setCategoryInput('');
      setUseCustomCategory(false);
      setSubCategory('');
      setBaseUnit('');
      setBaseUnitInput('');
      setUseCustomBaseUnit(false);
      setPurchaseUnit('');
      setPurchaseUnitInput('');
      setUseCustomPurchaseUnit(false);
      setConversionFactor('1');
      setStockMinimo('0');
      setActive(true);
      setIsNonStocking(false);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);

    // Validation
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    const finalCategory = useCustomCategory ? categoryInput.trim() : category;
    if (!finalCategory) {
      setError('La categoría es requerida');
      return;
    }

    const finalBaseUnit = useCustomBaseUnit ? baseUnitInput.trim() : baseUnit;
    if (!finalBaseUnit) {
      setError('La unidad base es requerida');
      return;
    }

    const finalPurchaseUnit = useCustomPurchaseUnit ? purchaseUnitInput.trim() : purchaseUnit;
    if (!finalPurchaseUnit) {
      setError('La unidad de compra es requerida');
      return;
    }

    const numConversionFactor = parseFloat(conversionFactor);
    if (isNaN(numConversionFactor) || numConversionFactor <= 0) {
      setError('El factor de conversión debe ser mayor a 0');
      return;
    }

    const numStockMinimo = parseFloat(stockMinimo);
    if (isNaN(numStockMinimo) || numStockMinimo < 0) {
      setError('El stock mínimo no puede ser negativo');
      return;
    }

    setIsSubmitting(true);

    try {
      if (productId) {
        // Update product
        await updateProduct({
          id: productId,
          name: name.trim(),
          brand: brand.trim() || undefined,
          category: finalCategory,
          subCategory: subCategory.trim() || undefined,
          baseUnit: finalBaseUnit,
          purchaseUnit: finalPurchaseUnit,
          conversionFactor: numConversionFactor,
          active: active,
          isNonStocking: isNonStocking,
        });

        // Update stock mínimo
        await setMinStock({
          productId,
          location: location,
          stockMinimo: numStockMinimo,
        });

        setToast({
          message: 'Producto actualizado correctamente',
          type: 'success',
          isOpen: true,
        });
      } else {
        // Create product
        const newProductId = await createProduct({
          name: name.trim(),
          brand: brand.trim() || "",
          category: finalCategory,
          subCategory: subCategory.trim() || undefined,
          baseUnit: finalBaseUnit,
          purchaseUnit: finalPurchaseUnit,
          conversionFactor: numConversionFactor,
          active: active,
          isNonStocking: isNonStocking,
        });

        // Initialize inventory
        await initializeInventory({
          productId: newProductId,
          location: location,
          stockActual: 0,
          stockMinimo: numStockMinimo,
        });

        setToast({
          message: 'Producto creado correctamente',
          type: 'success',
          isOpen: true,
        });
      }

      // Call callback if provided
      if (onProductUpdated) {
        onProductUpdated();
      }

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('Error al guardar producto:', error);
      setError(error.message || 'No se pudo guardar el producto. Intente de nuevo.');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!productId) return;

    setIsDeleting(true);
    try {
      await deleteProduct({ id: productId });

      setToast({
        message: 'Producto eliminado correctamente',
        type: 'success',
        isOpen: true,
      });

      if (onProductDeleted) {
        onProductDeleted();
      }

      if (onProductUpdated) {
        onProductUpdated();
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error: any) {
      console.error('Error al eliminar producto:', error);
      setToast({
        message: 'Error al eliminar el producto',
        type: 'error',
        isOpen: true,
      });
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (productId && !product && isOpen) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Editar Producto">
        <div className="text-center py-8">
          <p className="text-gray-500">Cargando producto...</p>
        </div>
      </Modal>
    );
  }

  const modalTitle = productId ? "Editar Producto" : "Crear Producto";

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Coca Cola 350ml"
              required
              className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Marca */}
          <div>
            <label htmlFor="edit-brand" className="block text-sm font-medium text-gray-700 mb-1">
              Marca
            </label>
            <input
              id="edit-brand"
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Ej: Coca Cola"
              className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-use-custom-category"
                  checked={useCustomCategory}
                  onChange={(e) => setUseCustomCategory(e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <label htmlFor="edit-use-custom-category" className="text-sm text-gray-600">
                  Usar categoría personalizada
                </label>
              </div>
              {useCustomCategory ? (
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  placeholder="Escribe la categoría"
                  required
                  className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Selecciona una categoría</option>
                  {categories?.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Subcategoría (opcional) */}
          <div>
            <label htmlFor="edit-subCategory" className="block text-sm font-medium text-gray-700 mb-1">
              Subcategoría <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="edit-subCategory"
              type="text"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder="Ej: Refrescos"
              className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Unidad Base */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidad Base *
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-use-custom-base-unit"
                  checked={useCustomBaseUnit}
                  onChange={(e) => setUseCustomBaseUnit(e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <label htmlFor="edit-use-custom-base-unit" className="text-sm text-gray-600">
                  Usar unidad personalizada
                </label>
              </div>
              {useCustomBaseUnit ? (
                <input
                  type="text"
                  value={baseUnitInput}
                  onChange={(e) => setBaseUnitInput(e.target.value)}
                  placeholder="Ej: unidad, litro, kg"
                  required
                  className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              ) : (
                <select
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value)}
                  required
                  className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Selecciona una unidad</option>
                  {BASE_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Unidad de Compra */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidad de Compra *
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-use-custom-purchase-unit"
                  checked={useCustomPurchaseUnit}
                  onChange={(e) => setUseCustomPurchaseUnit(e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                />
                <label htmlFor="edit-use-custom-purchase-unit" className="text-sm text-gray-600">
                  Usar unidad personalizada
                </label>
              </div>
              {useCustomPurchaseUnit ? (
                <input
                  type="text"
                  value={purchaseUnitInput}
                  onChange={(e) => setPurchaseUnitInput(e.target.value)}
                  placeholder="Ej: caja, fardo, saco"
                  required
                  className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              ) : (
                <select
                  value={purchaseUnit}
                  onChange={(e) => setPurchaseUnit(e.target.value)}
                  required
                  className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Selecciona una unidad</option>
                  {PURCHASE_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Factor de Conversión */}
          <div>
            <label htmlFor="edit-conversionFactor" className="block text-sm font-medium text-gray-700 mb-1">
              Factor de Conversión *
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Cuántas unidades base hay en una unidad de compra (ej: 24 unidades en una caja)
            </p>
            <input
              id="edit-conversionFactor"
              type="number"
              min="0.01"
              step="0.01"
              value={conversionFactor}
              onChange={(e) => setConversionFactor(e.target.value)}
              placeholder="1"
              required
              className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Stock Mínimo */}
          <div>
            <label htmlFor="edit-stockMinimo" className="block text-sm font-medium text-gray-700 mb-1">
              Stock Mínimo ({location === 'almacen' ? 'Almacén' : 'Cafetin'}) *
            </label>
            <input
              id="edit-stockMinimo"
              type="number"
              min="0"
              step="1"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              placeholder="0"
              required
              className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-xs text-gray-500 mt-1">Alerta cuando el stock esté por debajo de este valor</p>
          </div>

          {/* Estado Activo y No Contabiliza Stock */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-gray-700">Activo</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isNonStocking}
                onChange={(e) => setIsNonStocking(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-gray-700">No contabiliza stock (solo registra ventas en POS)</span>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            {productId && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setIsDeleteModalOpen(true)}
                disabled={isSubmitting}
                className="mr-auto"
              >
                Eliminar
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal for Delete */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Producto"
        message="¿Estás seguro de que deseas eliminar este producto? Esta acción eliminará el producto y todo su inventario asociado. NO se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="destructive"
        isLoading={isDeleting}
      />

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
