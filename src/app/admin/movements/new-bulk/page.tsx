'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { ItemAutocomplete } from '@/components/ui/ItemAutocomplete';
import { CreateProductModal } from '@/components/ui/CreateProductModal';

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

type PendingItem = {
    id: string; // Unique ID for the row
    productId: Id<'products'>;
    product: ConvexProduct;
    cantidad: number;
};

function BulkRegistrationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultType = searchParams.get('type') === 'entrega' ? 'entrega' : 'ingreso';

    const registerCompra = useMutation(api.movements.registerCompra);
    const registerAjuste = useMutation(api.movements.registerAjuste);
    const registerConsumo = useMutation(api.movements.registerConsumo);
    const registerTraslado = useMutation(api.movements.registerTraslado);

    const [movementType, setMovementType] = useState<'ingreso' | 'entrega'>(defaultType);
    const [motivoIngreso, setMotivoIngreso] = useState<'compra' | 'ajuste'>('compra');
    const [ubicacionIngreso, setUbicacionIngreso] = useState<'almacen' | 'cafetin'>('almacen');
    const [referencia, setReferencia] = useState('');
    const [areaDestino, setAreaDestino] = useState('');

    const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

    const [selectedProductId, setSelectedProductId] = useState<Id<'products'> | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<ConvexProduct | null>(null);
    const [cantidad, setCantidad] = useState<string>('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

    const handleProductCreated = async (productId: Id<'products'>, product: ConvexProduct) => {
        setSelectedProductId(productId);
        setSelectedProduct(product);
        setToast({
            message: `Producto "${product.name}" creado exitosamente`,
            type: 'success',
        });
    };

    const handleAddToList = () => {
        if (!selectedProductId || !selectedProduct) {
            setToast({ message: 'Por favor selecciona un producto', type: 'error' });
            return;
        }

        const numCantidad = parseFloat(cantidad);
        if (isNaN(numCantidad) || numCantidad <= 0) {
            setToast({ message: 'La cantidad debe ser mayor a 0', type: 'error' });
            return;
        }

        const existingIndex = pendingItems.findIndex(i => i.productId === selectedProductId);
        if (existingIndex >= 0) {
            const newItems = [...pendingItems];
            newItems[existingIndex].cantidad += numCantidad;
            setPendingItems(newItems);
        } else {
            setPendingItems([...pendingItems, {
                id: Math.random().toString(36).substring(7),
                productId: selectedProductId,
                product: selectedProduct,
                cantidad: numCantidad
            }]);
        }

        setSelectedProductId(null);
        setSelectedProduct(null);
        setCantidad('');
    };

    const handleRemoveFromList = (idToRemove: string) => {
        setPendingItems(pendingItems.filter(item => item.id !== idToRemove));
    };

    const handleCantidadKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddToList();
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (pendingItems.length === 0) {
            setToast({ message: 'La lista de productos está vacía', type: 'error' });
            return;
        }

        if (movementType === 'ingreso' && motivoIngreso === 'ajuste' && !referencia.trim()) {
            setToast({ message: 'Debe ingresar la razón del ajuste', type: 'error' });
            return;
        }

        if (movementType === 'entrega' && !areaDestino) {
            setToast({ message: 'Debe seleccionar un área de destino', type: 'error' });
            return;
        }

        setIsSubmitting(true);
        let successCount = 0;

        try {
            for (const item of pendingItems) {
                if (movementType === 'ingreso') {
                    if (motivoIngreso === 'compra') {
                        await registerCompra({
                            productId: item.productId,
                            location: ubicacionIngreso,
                            quantity: item.cantidad,
                            user: 'admin',
                        });
                    } else {
                        const currentStock = ubicacionIngreso === 'almacen' ? (item.product.stockAlmacen || 0) : (item.product.stockCafetin || 0);
                        const newStock = currentStock + item.cantidad;
                        await registerAjuste({
                            productId: item.productId,
                            location: ubicacionIngreso,
                            newStock: newStock,
                            user: 'admin',
                            reason: referencia.trim() || 'Ajuste de inventario',
                        });
                    }
                } else {
                    // entrega
                    if (areaDestino === 'Cafetin') {
                        await registerTraslado({
                            productId: item.productId,
                            from: 'almacen',
                            to: 'cafetin',
                            quantity: item.cantidad,
                            user: 'admin',
                        });
                    } else {
                        await registerConsumo({
                            productId: item.productId,
                            location: 'almacen',
                            quantity: item.cantidad,
                            user: 'admin',
                            destination: areaDestino,
                        });
                    }
                }
                successCount++;
            }

            setToast({
                message: `Se registraron ${successCount} movimientos exitosamente`,
                type: 'success',
            });

            setPendingItems([]);
            setReferencia('');
            setAreaDestino('');

            setTimeout(() => {
                router.push('/admin/movements');
            }, 1500);

        } catch (error: any) {
            console.error('Error en registro masivo:', error);
            setToast({
                message: `Error al procesar el ítem ${successCount + 1}: ${error.message || 'Error desconocido'}`,
                type: 'error',
            });
            // Remove successful items so they don't resubmit
            setPendingItems(prev => prev.slice(successCount));
        } finally {
            setIsSubmitting(false);
        }
    };

    const isIngreso = movementType === 'ingreso';

    return (
        <>
            <div className="mb-6">
                <Button
                    variant="secondary"
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    ← Volver
                </Button>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Registro Múltiple
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Agrega varios productos a la vez
                        </p>
                    </div>

                    {/* Main Toggle */}
                    <div className="flex bg-gray-200 p-1 rounded-lg">
                        <button
                            onClick={() => setMovementType('ingreso')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isIngreso
                                ? 'bg-white text-emerald-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Ingresos
                        </button>
                        <button
                            onClick={() => setMovementType('entrega')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${!isIngreso
                                ? 'bg-white text-red-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Entregas
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Form & Configuration */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                        <h2 className="font-semibold text-gray-900 mb-4 border-b pb-2">Configuración General</h2>

                        {isIngreso ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ubicación de Ingreso *
                                    </label>
                                    <select
                                        value={ubicacionIngreso}
                                        onChange={(e) => setUbicacionIngreso(e.target.value as 'almacen' | 'cafetin')}
                                        className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    >
                                        <option value="almacen">Almacén Principal</option>
                                        <option value="cafetin">Cafetín</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Motivo *
                                    </label>
                                    <div className="flex gap-4 flex-wrap">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="motivoIngreso"
                                                value="compra"
                                                checked={motivoIngreso === 'compra'}
                                                onChange={(e) => setMotivoIngreso(e.target.value as 'compra' | 'ajuste')}
                                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Compra</span>
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="motivoIngreso"
                                                value="ajuste"
                                                checked={motivoIngreso === 'ajuste'}
                                                onChange={(e) => setMotivoIngreso(e.target.value as 'compra' | 'ajuste')}
                                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">Ajuste</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="referencia" className="block text-sm font-medium text-gray-700 mb-2">
                                        {motivoIngreso === 'ajuste' ? 'Razón del ajuste *' : 'Referencia'}{' '}
                                        {motivoIngreso !== 'ajuste' && <span className="text-gray-400 font-normal">(opcional)</span>}
                                    </label>
                                    <input
                                        id="referencia"
                                        type="text"
                                        value={referencia}
                                        onChange={(e) => setReferencia(e.target.value)}
                                        placeholder={motivoIngreso === 'ajuste' ? 'Explica el ajuste...' : 'Factura, proveedor, etc.'}
                                        className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="areaDestino" className="block text-sm font-medium text-gray-700 mb-2">
                                        Área de Destino *
                                    </label>
                                    <select
                                        id="areaDestino"
                                        value={areaDestino}
                                        onChange={(e) => setAreaDestino(e.target.value)}
                                        className="block w-full h-10 px-3 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                        <h2 className="font-semibold text-gray-900 mb-4 border-b pb-2">Agregar Producto</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Producto
                                </label>
                                <ItemAutocomplete
                                    value={selectedProductId}
                                    onChange={handleProductChange}
                                    placeholder="Buscar producto..."
                                    showCreateOption={isIngreso}
                                    onCreateNew={() => setShowCreateModal(true)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700 mb-2">
                                    Cantidad
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
                                        onKeyDown={handleCantidadKeyDown}
                                        placeholder="0"
                                        className={`block w-full h-12 text-xl text-center border border-gray-300 rounded-md bg-white placeholder-gray-400 focus:outline-none focus:ring-2 font-semibold ${isIngreso ? 'focus:ring-emerald-500 focus:border-emerald-500' : 'focus:ring-red-500 focus:border-red-500'
                                            }`}
                                    />
                                    {selectedProduct && (
                                        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 text-sm text-gray-500">
                                            {selectedProduct.baseUnit}
                                        </div>
                                    )}
                                </div>
                                {selectedProduct && (
                                    <p className="mt-2 text-xs text-gray-500 text-center">
                                        Stock actual: <span className="font-medium">
                                            {isIngreso && ubicacionIngreso === 'cafetin' ? selectedProduct.stockCafetin : selectedProduct.stockAlmacen} {selectedProduct.baseUnit}
                                        </span>
                                    </p>
                                )}
                            </div>

                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleAddToList}
                                disabled={!selectedProductId || !cantidad}
                                className="w-full h-10"
                            >
                                + Agregar a la lista
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Pending Items Table */}
                <div className="lg:col-span-2 flex flex-col h-full space-y-4">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col flex-1 overflow-hidden min-h-[400px]">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h2 className="font-semibold text-gray-900">
                                Lista de Productos ({pendingItems.length})
                            </h2>
                            {pendingItems.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setPendingItems([])}
                                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                                >
                                    Vaciar lista
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-0">
                            {pendingItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12 px-4 text-center">
                                    <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                    <p>Aún no has agregado productos a la lista</p>
                                    <p className="text-sm mt-1">Busca un producto y presiona "Agregar a la lista"</p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-white sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Producto
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Cantidad
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                                Acción
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {pendingItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="font-medium text-gray-900">{item.product.name}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {item.product.brand} • {item.product.category}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-medium">
                                                    <span className={isIngreso ? 'text-emerald-700' : 'text-red-700'}>
                                                        {isIngreso ? '+' : '-'}{item.cantidad}
                                                    </span>
                                                    <span className="text-gray-500 ml-1 font-normal">
                                                        {item.product.baseUnit}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveFromList(item.id)}
                                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting || pendingItems.length === 0}
                        className={`w-full h-14 text-lg shadow-md ${isIngreso
                            ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                            : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                            }`}
                    >
                        {isSubmitting ? 'Registrando...' : 'Confirmar y Registrar'}
                    </Button>
                </div>

            </div>

            <CreateProductModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onProductCreated={handleProductCreated}
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    isOpen={!!toast}
                    onClose={() => setToast(null)}
                />
            )}
        </>
    );
}

export default function BulkRegistrationPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <PageContainer>
                <Suspense fallback={
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                    </div>
                }>
                    <BulkRegistrationContent />
                </Suspense>
            </PageContainer>
        </div>
    );
}
