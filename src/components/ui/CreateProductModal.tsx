'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { Modal } from './Modal';
import { Button } from './Button';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (productId: Id<'products'>, product: any) => void;
}

const BASE_UNITS = ['Unidad', 'Litro', 'Kg', 'Gr', 'Pieza'];
const PURCHASE_UNITS = ['Caja', 'Fardo', 'Saco', 'Paquete', 'Unidad', 'Kg'];

export function CreateProductModal({ isOpen, onClose, onProductCreated }: CreateProductModalProps) {
  const createProduct = useMutation(api.products.create);
  const initializeInventory = useMutation(api.inventory.initialize);
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
  const [stockMinimoAlmacen, setStockMinimoAlmacen] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
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
      setStockMinimoAlmacen('0');
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

    if (!brand.trim()) {
      setError('La marca es requerida');
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

    const numStockMinimo = parseFloat(stockMinimoAlmacen);
    if (isNaN(numStockMinimo) || numStockMinimo < 0) {
      setError('El stock mínimo no puede ser negativo');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create product
      const productId = await createProduct({
        name: name.trim(),
        brand: brand.trim(),
        category: finalCategory,
        subCategory: subCategory.trim() || undefined,
        baseUnit: finalBaseUnit,
        purchaseUnit: finalPurchaseUnit,
        conversionFactor: numConversionFactor,
        active: true,
      });

      // Initialize inventory in almacen
      await initializeInventory({
        productId,
        location: 'almacen',
        stockActual: 0,
        stockMinimo: numStockMinimo,
      });

      // Get the created product with inventory info
      // We need to wait a bit for the inventory to be available
      // For now, construct the product object with the data we have
      // The useInventoryData hook will sync it automatically
      const createdProduct = {
        _id: productId,
        name: name.trim(),
        brand: brand.trim(),
        category: finalCategory,
        subCategory: subCategory.trim() || undefined,
        baseUnit: finalBaseUnit,
        purchaseUnit: finalPurchaseUnit,
        conversionFactor: numConversionFactor,
        active: true,
        totalStock: 0,
        stockAlmacen: 0,
        stockCafetin: 0,
        status: 'ok' as const,
      };

      onProductCreated(productId, createdProduct);
      onClose();
    } catch (error: any) {
      console.error('Error al crear producto:', error);
      setError(error.message || 'No se pudo crear el producto. Intente de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Nuevo Producto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Nombre */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre *
          </label>
          <input
            id="name"
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
          <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
            Marca *
          </label>
          <input
            id="brand"
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Ej: Coca Cola"
            required
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
                id="use-custom-category"
                checked={useCustomCategory}
                onChange={(e) => setUseCustomCategory(e.target.checked)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
              />
              <label htmlFor="use-custom-category" className="text-sm text-gray-600">
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
          <label htmlFor="subCategory" className="block text-sm font-medium text-gray-700 mb-1">
            Subcategoría <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            id="subCategory"
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
                id="use-custom-base-unit"
                checked={useCustomBaseUnit}
                onChange={(e) => setUseCustomBaseUnit(e.target.checked)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
              />
              <label htmlFor="use-custom-base-unit" className="text-sm text-gray-600">
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
                id="use-custom-purchase-unit"
                checked={useCustomPurchaseUnit}
                onChange={(e) => setUseCustomPurchaseUnit(e.target.checked)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
              />
              <label htmlFor="use-custom-purchase-unit" className="text-sm text-gray-600">
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
          <label htmlFor="conversionFactor" className="block text-sm font-medium text-gray-700 mb-1">
            Factor de Conversión *
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Cuántas unidades base hay en una unidad de compra (ej: 24 unidades en una caja)
          </p>
          <input
            id="conversionFactor"
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

        {/* Stock Mínimo Almacén */}
        <div>
          <label htmlFor="stockMinimoAlmacen" className="block text-sm font-medium text-gray-700 mb-1">
            Stock Mínimo Almacén <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            id="stockMinimoAlmacen"
            type="number"
            min="0"
            step="0.01"
            value={stockMinimoAlmacen}
            onChange={(e) => setStockMinimoAlmacen(e.target.value)}
            placeholder="0"
            className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Creando...' : 'Crear y Seleccionar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
