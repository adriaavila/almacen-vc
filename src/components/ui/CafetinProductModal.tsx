'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { Modal } from './Modal';
import { Button } from './Button';
import { Toast } from './Toast';
import { ConfirmationModal } from './ConfirmationModal';

interface CafetinProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId: Id<'products'> | null;
    onProductCreated?: (productId: Id<'products'>, product: any) => void;
    onProductUpdated?: () => void;
    onProductDeleted?: () => void;
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

export function CafetinProductModal({
    isOpen,
    onClose,
    productId,
    onProductCreated,
    onProductUpdated,
    onProductDeleted,
}: CafetinProductModalProps) {
    const product = useQuery(
        api.products.getWithInventory,
        productId && isOpen ? { id: productId } : 'skip'
    ) as ProductWithInventory | undefined;

    // Data Fetching for "Real" Options
    const existingSubCategories = useQuery(api.products.getSubCategories, { category: 'Cafetin' });
    const existingUnits = useQuery(api.products.getUniqueUnits);

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
    const [stockMinimo, setStockMinimo] = useState<string>('0');
    const [active, setActive] = useState(true);

    // Custom input states
    const [isCustomSubCategory, setIsCustomSubCategory] = useState(false);
    const [customSubCategory, setCustomSubCategory] = useState('');
    const [isCustomUnit, setIsCustomUnit] = useState(false);
    const [customUnit, setCustomUnit] = useState('');

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

    // Compute final lists with defaults + database values
    const subCategoryOptions = useMemo(() => {
        const fromDb = existingSubCategories || [];
        return Array.from(new Set(fromDb)).sort();
    }, [existingSubCategories]);

    const unitOptions = useMemo(() => {
        const defaults = ['Unidad', 'Porción', 'Vaso', 'Taza', 'Pieza'];
        const fromDb = existingUnits || [];
        return Array.from(new Set([...defaults, ...fromDb])).sort();
    }, [existingUnits]);

    // Initialize form when product loads
    useEffect(() => {
        if (product && isOpen && productId && product._id === productId) {
            const inventory = product.inventory?.find(inv => inv.location === 'cafetin');

            setName(product.name || '');
            setBrand(product.brand || '');

            const currentSubCat = product.subCategory || '';
            if (currentSubCat && !subCategoryOptions.includes(currentSubCat) && existingSubCategories) {
                // If current value isn't in options, treat as custom or just set it
                // Simpler: Just set it. If it's not in dropdown, we might want to switch to custom mode or add it to list
                // For now, we'll rely on the fact that if it's from DB, it SHOULD be in existingSubCategories
                setSubCategory(currentSubCat);
            } else {
                setSubCategory(currentSubCat || subCategoryOptions[0]);
            }

            setBaseUnit(product.baseUnit || 'Unidad');
            setStockMinimo(String(inventory?.stockMinimo || 0));
            setActive(product.active ?? true);

            // Reset custom states
            setIsCustomSubCategory(false);
            setIsCustomUnit(false);
            setCustomSubCategory('');
            setCustomUnit('');

            setError(null);
        } else if (isOpen && !productId) {
            // Set default for new product
            if (!subCategory && subCategoryOptions.length > 0) {
                setSubCategory(subCategoryOptions[0]);
            }
        }
    }, [product, isOpen, productId, subCategoryOptions, existingSubCategories]);

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
            setError('Selecciona o escribe una unidad');
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
            const capitalizedUnit = finalBaseUnit.charAt(0).toUpperCase() + finalBaseUnit.slice(1);

            if (productId) {
                // Update existing product
                await updateProduct({
                    id: productId,
                    name: name.trim(),
                    brand: brand.trim() || undefined,
                    category: 'cafetin',
                    subCategory: finalSubCategory,
                    baseUnit: capitalizedUnit,
                    purchaseUnit: capitalizedUnit,
                    conversionFactor: 1,
                    active: active,
                });

                // Update stock minimum
                await setMinStock({
                    productId,
                    location: 'cafetin',
                    stockMinimo: numStockMinimo,
                });

                setToast({
                    message: 'Producto actualizado correctamente',
                    type: 'success',
                    isOpen: true,
                });

                if (onProductUpdated) {
                    onProductUpdated();
                }
            } else {
                // Create new product
                const newProductId = await createProduct({
                    name: name.trim(),
                    brand: brand.trim() || '',
                    category: 'cafetin',
                    subCategory: finalSubCategory,
                    baseUnit: capitalizedUnit,
                    purchaseUnit: capitalizedUnit,
                    conversionFactor: 1,
                    active: active,
                });

                // Initialize inventory
                await initializeInventory({
                    productId: newProductId,
                    location: 'cafetin',
                    stockActual: 0,
                    stockMinimo: numStockMinimo,
                });

                const createdProduct = {
                    _id: newProductId,
                    name: name.trim(),
                    brand: brand.trim() || '',
                    category: 'cafetin',
                    subCategory: finalSubCategory,
                    baseUnit: capitalizedUnit,
                    purchaseUnit: capitalizedUnit,
                    conversionFactor: 1,
                    active: active,
                    totalStock: 0,
                    stockAlmacen: 0,
                    stockCafetin: 0,
                    status: 'ok' as const,
                };

                setToast({
                    message: 'Producto creado correctamente',
                    type: 'success',
                    isOpen: true,
                });

                if (onProductCreated) {
                    onProductCreated(newProductId, createdProduct);
                }

                if (onProductUpdated) {
                    onProductUpdated();
                }
            }

            setTimeout(() => {
                onClose();
            }, 800);
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
            }, 800);
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
            <Modal isOpen={isOpen} onClose={onClose} title="Cargando...">
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    <p className="text-gray-500 mt-2">Cargando producto...</p>
                </div>
            </Modal>
        );
    }

    const modalTitle = productId ? 'Editar Producto' : 'Nuevo Producto';
    const isCreating = !productId;

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
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
                                {unitOptions.map((unit) => (
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
                            Stock Mínimo
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
                    <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
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
            </Modal>

            {/* Confirmation Modal and Toast same as before */}
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

            <Toast
                message={toast.message}
                type={toast.type}
                isOpen={toast.isOpen}
                onClose={() => setToast({ ...toast, isOpen: false })}
            />
        </>
    );
}
