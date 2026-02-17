'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { Button } from './Button';
import { ConfirmationModal } from './ConfirmationModal';
import { Product } from '@/types';

interface CafetinProductFormProps {
    productId: Id<'products'> | null;
    onSuccess: (message: string) => void;
    onCancel: () => void;
    onProductDeleted?: () => void;
    className?: string;
}

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
};

export function CafetinProductForm({
    productId,
    onSuccess,
    onCancel,
    onProductDeleted,
    className
}: CafetinProductFormProps) {
    const product = useQuery(
        api.products.getWithInventory,
        productId ? { id: productId } : 'skip'
    ) as ProductWithInventory | undefined;

    // Data Fetching for "Real" Options
    const existingSubCategories = useQuery(api.products.getSubCategories, { category: 'Cafetin' });

    const createProduct = useMutation(api.products.create);
    const updateProduct = useMutation(api.products.update);
    const deleteProduct = useMutation(api.products.deleteProduct);
    const initializeInventory = useMutation(api.inventory.initialize);
    const setMinStock = useMutation(api.inventory.setMinStock);

    // Form state
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [baseUnit, setBaseUnit] = useState('Unidad');
    const [purchaseUnit, setPurchaseUnit] = useState('Unidad');
    const [conversionFactor, setConversionFactor] = useState<string>('1');
    const [stockMinimo, setStockMinimo] = useState<string>('0');
    const [active, setActive] = useState(true);

    // Custom input states
    const [isCustomSubCategory, setIsCustomSubCategory] = useState(false);
    const [customSubCategory, setCustomSubCategory] = useState('');
    const [isCustomUnit, setIsCustomUnit] = useState(false);
    const [customUnit, setCustomUnit] = useState('');
    const [isCustomPurchaseUnit, setIsCustomPurchaseUnit] = useState(false);
    const [customPurchaseUnit, setCustomPurchaseUnit] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Compute final lists with defaults + database values
    const subCategoryOptions = useMemo(() => {
        const fromDb = existingSubCategories || [];
        return Array.from(new Set(fromDb)).sort();
    }, [existingSubCategories]);

    const saleUnitOptions = ['Unidad', 'Barrita', 'Bolsa', 'Lata', 'Paquete', 'Taza'];
    const purchaseUnitOptions = ['Paquete', 'Caja'];

    // Initialize form when product loads
    useEffect(() => {
        if (product && productId && product._id === productId) {
            const inventory = product.inventory?.find(inv => inv.location === 'cafetin');

            setName(product.name || '');
            setBrand(product.brand || '');

            const currentSubCat = product.subCategory || '';
            if (currentSubCat && !subCategoryOptions.includes(currentSubCat) && existingSubCategories) {
                setSubCategory(currentSubCat);
            } else {
                setSubCategory(currentSubCat || subCategoryOptions[0]);
            }

            setBaseUnit(product.baseUnit || 'Unidad');
            setPurchaseUnit(product.purchaseUnit || product.baseUnit || 'Unidad');
            setConversionFactor(String(product.conversionFactor || 1));
            setStockMinimo(String(inventory?.stockMinimo || 0));
            setActive(product.active ?? true);

            // Reset custom states
            setIsCustomSubCategory(false);
            setIsCustomUnit(false);
            setIsCustomPurchaseUnit(false);
            setCustomSubCategory('');
            setCustomUnit('');
            setCustomPurchaseUnit('');

            setError(null);
        } else if (!productId) {
            // Set default for new product
            setName('');
            setBrand('');
            if (!subCategory && subCategoryOptions.length > 0) {
                setSubCategory(subCategoryOptions[0] || '');
            }
            setBaseUnit('Unidad');
            setPurchaseUnit('Unidad');
            setConversionFactor('1');
            setStockMinimo('0');
            setActive(true);

            // Reset custom states
            setIsCustomSubCategory(false);
            setIsCustomUnit(false);
            setIsCustomPurchaseUnit(false);
            setCustomSubCategory('');
            setCustomUnit('');
            setCustomPurchaseUnit('');
            setError(null);
        }
    }, [product, productId, subCategoryOptions, existingSubCategories, subCategory]); // Added subCategory dependency carefully

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!name.trim()) {
            setError('El nombre del producto es requerido');
            return;
        }

        const finalSubCategory = isCustomSubCategory ? customSubCategory.trim() : subCategory;
        if (!finalSubCategory) {
            setError('Selecciona o escribe una subcategoría');
            return;
        }

        const finalBaseUnit = isCustomUnit ? customUnit.trim() : baseUnit;
        if (!finalBaseUnit) {
            setError('Selecciona o escribe una unidad base');
            return;
        }

        const finalPurchaseUnit = isCustomPurchaseUnit ? customPurchaseUnit.trim() : purchaseUnit;
        if (!finalPurchaseUnit) {
            setError('Selecciona o escribe una unidad de compra');
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
            // Use capitalizing for units to maintain consistency
            const capitalizedBaseUnit = finalBaseUnit.charAt(0).toUpperCase() + finalBaseUnit.slice(1);
            const capitalizedPurchaseUnit = finalPurchaseUnit.charAt(0).toUpperCase() + finalPurchaseUnit.slice(1);

            if (productId) {
                // Update existing product
                await updateProduct({
                    id: productId,
                    name: name.trim(),
                    brand: brand.trim() || undefined,
                    category: 'cafetin',
                    subCategory: finalSubCategory,
                    baseUnit: capitalizedBaseUnit,
                    purchaseUnit: capitalizedPurchaseUnit,
                    conversionFactor: numConversionFactor,
                    active: active,
                });

                // Update stock minimum
                await setMinStock({
                    productId,
                    location: 'cafetin',
                    stockMinimo: numStockMinimo,
                });

                onSuccess('Producto actualizado correctamente');
            } else {
                // Create new product
                const newProductId = await createProduct({
                    name: name.trim(),
                    brand: brand.trim() || '',
                    category: 'cafetin',
                    subCategory: finalSubCategory,
                    baseUnit: capitalizedBaseUnit,
                    purchaseUnit: capitalizedPurchaseUnit,
                    conversionFactor: numConversionFactor,
                    active: active,
                });

                // Initialize inventory
                await initializeInventory({
                    productId: newProductId,
                    location: 'cafetin',
                    stockActual: 0,
                    stockMinimo: numStockMinimo,
                });

                onSuccess('Producto creado correctamente');

                // Clear form if creating another
                setName('');
                setBrand('');
            }
            setIsSubmitting(false);

        } catch (error) {
            console.error('Error al guardar producto:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            setError(errorMessage || 'No se pudo guardar el producto. Intente de nuevo.');
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!productId) return;

        setIsDeleting(true);
        try {
            await deleteProduct({ id: productId });
            if (onProductDeleted) {
                onProductDeleted();
            }
            onSuccess('Producto eliminado correctamente');
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            setError('Error al eliminar el producto');
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    if (productId && !product) {
        return (
            <div className="flex flex-col items-center justify-center p-8 h-full min-h-[300px]">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                <p className="text-gray-500 mt-2">Cargando producto...</p>
            </div>
        );
    }

    const isCreating = !productId;

    return (
        <div className={className}>
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Location indicator */}
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium text-emerald-700">Ubicación: Cafetín</span>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Nombre */}
                <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Nombre del Producto *
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ej: Coca Cola 350ml, Galletas Oreo..."
                        required
                        autoFocus
                        className="block w-full h-11 px-3 text-base border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                    />
                </div>

                {/* Subcategoría (Dropdown real) */}
                <div>
                    <label htmlFor="subCategory" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Subcategoría *
                    </label>

                    {!isCustomSubCategory ? (
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <select
                                    id="subCategory"
                                    value={subCategory}
                                    onChange={(e) => {
                                        if (e.target.value === 'custom_new_value') {
                                            setIsCustomSubCategory(true);
                                            setCustomSubCategory('');
                                        } else {
                                            setSubCategory(e.target.value);
                                        }
                                    }}
                                    className="block w-full h-11 pl-3 pr-10 text-base border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none"
                                >
                                    <option value="" disabled>Selecciona una categoría</option>
                                    {subCategoryOptions.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                    <option value="custom_new_value" className="font-semibold text-emerald-600">+ Nueva Subcategoría...</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2 animate-in fade-in duration-200">
                            <input
                                type="text"
                                value={customSubCategory}
                                onChange={(e) => setCustomSubCategory(e.target.value)}
                                placeholder="Escribe la nueva subcategoría..."
                                className="block flex-1 h-11 px-3 text-base border border-emerald-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setIsCustomSubCategory(false)}
                                className="px-4 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}
                </div>

                {/* Configuración de Inventario */}
                <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Configuración de Inventario
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        {/* Unidad de Compra */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                Unidad de Compra
                            </label>
                            {!isCustomPurchaseUnit ? (
                                <div className="relative">
                                    <select
                                        value={purchaseUnit}
                                        onChange={(e) => {
                                            if (e.target.value === 'custom_new_value') {
                                                setIsCustomPurchaseUnit(true);
                                                setCustomPurchaseUnit('');
                                            } else {
                                                setPurchaseUnit(e.target.value);
                                            }
                                        }}
                                        className="block w-full h-10 pl-3 pr-8 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none"
                                    >
                                        {purchaseUnitOptions.map((unit) => (
                                            <option key={unit} value={unit}>{unit}</option>
                                        ))}
                                        <option value="custom_new_value" className="font-semibold text-emerald-600">+ Otra...</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customPurchaseUnit}
                                        onChange={(e) => setCustomPurchaseUnit(e.target.value)}
                                        placeholder="Ej: Caja"
                                        className="block flex-1 h-10 px-3 text-sm border border-emerald-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomPurchaseUnit(false)}
                                        className="px-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Factor de Conversión */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                Contenido (Factor)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    value={conversionFactor}
                                    onChange={(e) => setConversionFactor(e.target.value)}
                                    className="block w-full h-10 px-3 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span className="text-xs text-gray-500">
                                        {isCustomUnit ? (customUnit || 'unidades') : baseUnit}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Helper Text for Conversion */}
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 flex items-start gap-2 mb-4">
                        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>
                            <strong>Resumen:</strong> Compra en <u>{isCustomPurchaseUnit ? (customPurchaseUnit || '...') : purchaseUnit}</u> y vende en <u>{isCustomUnit ? (customUnit || '...') : baseUnit}</u>.
                            <br />
                            1 {isCustomPurchaseUnit ? (customPurchaseUnit || '...') : purchaseUnit} = {conversionFactor || '...'} {isCustomUnit ? (customUnit || '...') : baseUnit}.
                        </p>
                    </div>
                </div>

                {/* Marca (opcional) */}
                <div>
                    <label htmlFor="brand" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Marca <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <input
                        id="brand"
                        type="text"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder="Ej: Coca Cola, Nestlé..."
                        className="block w-full h-11 px-3 text-base border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                    />
                </div>

                {/* Unidad Base */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Unidad de Venta
                    </label>

                    {!isCustomUnit ? (
                        <div className="flex flex-wrap gap-2">
                            {saleUnitOptions.map((unit) => (
                                <button
                                    key={unit}
                                    type="button"
                                    onClick={() => setBaseUnit(unit)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${baseUnit === unit
                                        ? 'bg-gray-800 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {unit}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => { setIsCustomUnit(true); setCustomUnit(''); }}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 border-dashed"
                            >
                                + Otra
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2 animate-in fade-in duration-200">
                            <input
                                type="text"
                                value={customUnit}
                                onChange={(e) => setCustomUnit(e.target.value)}
                                placeholder="Ej: Botella, Paquete..."
                                className="block flex-1 h-11 px-3 text-base border border-emerald-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setIsCustomUnit(false)}
                                className="px-4 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}
                </div>



                {/* Stock Mínimo */}
                <div>
                    <label htmlFor="stockMinimo" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Stock Mínimo (Alerta)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                        Alertar cuando el stock llegue a:
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setStockMinimo(String(Math.max(0, parseInt(stockMinimo) - 1)))}
                            className="h-11 w-11 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-lg font-bold shadow-sm"
                        >
                            −
                        </button>
                        <input
                            id="stockMinimo"
                            type="number"
                            min="0"
                            step="1"
                            value={stockMinimo}
                            onChange={(e) => setStockMinimo(e.target.value)}
                            className="w-24 h-11 px-3 text-center text-lg font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <button
                            type="button"
                            onClick={() => setStockMinimo(String(parseInt(stockMinimo) + 1))}
                            className="h-11 w-11 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-lg font-bold shadow-sm"
                        >
                            +
                        </button>
                        <span className="text-sm font-medium text-gray-600">
                            {isCustomUnit ? (customUnit || 'unidades') : baseUnit}
                        </span>
                    </div>
                </div>

                {/* Estado Activo - solo para edición */}
                {!isCreating && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div>
                            <span className="text-sm font-semibold text-gray-700">Stock Visible</span>
                            <p className="text-xs text-gray-500">Desactiva para ocultar del inventario</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActive(!active)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${active ? 'bg-emerald-600' : 'bg-gray-200'
                                }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${active ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6 md:sticky md:bottom-0 md:bg-white md:py-4 md:-mx-1 md:z-10">
                    {productId && (
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => setIsDeleteModalOpen(true)}
                            disabled={isSubmitting}
                            className="mr-auto"
                        >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="hidden sm:inline">Eliminar</span>
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting}
                        className="min-w-[140px]"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Guardando...</span>
                            </div>
                        ) : isCreating ? (
                            'Crear Producto'
                        ) : (
                            'Guardar Cambios'
                        )}
                    </Button>
                </div>
            </form>

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
        </div>
    );
}
