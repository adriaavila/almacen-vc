'use client';

import { useState, useRef, useEffect, Suspense, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useConvex } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { ItemAutocomplete } from '@/components/ui/ItemAutocomplete';
import { CreateProductModal } from '@/components/ui/CreateProductModal';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductListSkeleton } from '@/components/ui/SkeletonLoader';
import { pluralizeUnit, normalizeSearchText } from '@/lib/utils';

type Tab = 'manual' | 'pendientes';

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

// ============================================================
// Main Tab Control Component
// ============================================================
function CafetinIngresoContent() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('manual');

    return (
        <>
            <div className="mb-6">
                <Button
                    variant="secondary"
                    onClick={() => router.back()}
                    className="mb-4 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 border-none"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Volver a Pedidos
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        Gestión de Ingresos a Cafetín
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Registra ingresos manuales o recibe pedidos realizados por WhatsApp
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 mb-6 sticky top-0 bg-gray-50 z-10 pt-2">
                <button
                    onClick={() => setActiveTab('manual')}
                    className={`px-4 py-3 text-sm font-medium transition-colors relative flex items-center justify-center min-w-[120px] ${activeTab === 'manual'
                        ? 'text-emerald-600 bg-emerald-50/50 rounded-t-lg'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-t-lg'
                        }`}
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Ingreso/Ajuste Manual
                    {activeTab === 'manual' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('pendientes')}
                    className={`px-4 py-3 text-sm font-medium transition-colors relative flex items-center justify-center min-w-[120px] ${activeTab === 'pendientes'
                        ? 'text-emerald-600 bg-emerald-50/50 rounded-t-lg'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-t-lg'
                        }`}
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Recepcionar Proveedor
                    {activeTab === 'pendientes' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                    )}
                </button>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'manual' ? <ManualIngresoView /> : <RecepcionesPendientesView />}
            </div>
        </>
    );
}

// ============================================================
// TAB 1: Ingreso Manual
// ============================================================
function ManualIngresoView() {
    const router = useRouter();

    const registerCompra = useMutation(api.movements.registerCompra);
    const registerAjuste = useMutation(api.movements.registerAjuste);

    const [motivoIngreso, setMotivoIngreso] = useState<'compra' | 'ajuste'>('compra');
    const [referencia, setReferencia] = useState('');

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

        const cantidadEnBase = numCantidad * (selectedProduct.conversionFactor || 1);

        const existingIndex = pendingItems.findIndex(i => i.productId === selectedProductId);
        if (existingIndex >= 0) {
            const newItems = [...pendingItems];
            newItems[existingIndex].cantidad += cantidadEnBase;
            setPendingItems(newItems);
        } else {
            setPendingItems([...pendingItems, {
                id: Math.random().toString(36).substring(7),
                productId: selectedProductId,
                product: selectedProduct,
                cantidad: cantidadEnBase
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

        if (motivoIngreso === 'ajuste' && !referencia.trim()) {
            setToast({ message: 'Debe ingresar la razón del ajuste', type: 'error' });
            return;
        }

        setIsSubmitting(true);
        let successCount = 0;

        try {
            for (const item of pendingItems) {
                if (motivoIngreso === 'compra') {
                    await registerCompra({
                        productId: item.productId,
                        location: 'cafetin',
                        quantity: item.cantidad,
                        user: 'cafetin', // o el usuario logueado pero es requester
                    });
                } else {
                    const currentStock = item.product.stockCafetin || 0;
                    const newStock = currentStock + item.cantidad;
                    await registerAjuste({
                        productId: item.productId,
                        location: 'cafetin',
                        newStock: newStock,
                        user: 'cafetin',
                        reason: referencia.trim() || 'Ajuste de inventario',
                    });
                }
                successCount++;
            }

            setToast({
                message: `Se registraron ${successCount} ingresos a cafetín exitosamente`,
                type: 'success',
            });

            setPendingItems([]);
            setReferencia('');

            setTimeout(() => {
                router.push('/requester/pedido?area=Cafetin');
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Form & Configuration */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
                    <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">1</span>
                        Configuración
                    </h2>

                    <div className="space-y-5">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Motivo *
                            </label>
                            <div className="flex gap-6 flex-wrap">
                                <label className="flex items-center cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="motivoIngreso"
                                        value="compra"
                                        checked={motivoIngreso === 'compra'}
                                        onChange={(e) => setMotivoIngreso(e.target.value as 'compra' | 'ajuste')}
                                        className="h-4.5 w-4.5 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                    />
                                    <span className="ml-2.5 text-sm text-gray-700 group-hover:text-gray-900 font-medium">Compra</span>
                                </label>
                                <label className="flex items-center cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="motivoIngreso"
                                        value="ajuste"
                                        checked={motivoIngreso === 'ajuste'}
                                        onChange={(e) => setMotivoIngreso(e.target.value as 'compra' | 'ajuste')}
                                        className="h-4.5 w-4.5 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                    />
                                    <span className="ml-2.5 text-sm text-gray-700 group-hover:text-gray-900 font-medium">Ajuste</span>
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
                                className="block w-full h-11 px-4 border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
                    <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">2</span>
                        Agregar Producto
                    </h2>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Producto de Cafetín
                            </label>
                            <ItemAutocomplete
                                value={selectedProductId}
                                onChange={handleProductChange}
                                placeholder="Buscar producto..."
                                showCreateOption={true}
                                onCreateNew={() => setShowCreateModal(true)}
                                autoFocus
                                categoryFilter="Cafetin" // Filter by Cafetin category
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
                                    className="block w-full h-12 px-4 text-xl text-center border border-gray-300 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 font-semibold focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                                />
                                {selectedProduct && (
                                    <div className="absolute top-1/2 right-4 transform -translate-y-1/2 text-sm text-gray-500 font-medium">
                                        {selectedProduct.purchaseUnit}
                                    </div>
                                )}
                            </div>
                            {selectedProduct && selectedProduct.stockCafetin !== undefined && (
                                <p className="mt-2 text-xs text-center text-gray-500 bg-gray-50 py-1.5 rounded-md border border-gray-100">
                                    Stock actual: <span className="font-semibold text-gray-900">
                                        {selectedProduct.stockCafetin} {selectedProduct.baseUnit}
                                    </span>
                                </p>
                            )}
                        </div>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleAddToList}
                            disabled={!selectedProductId || !cantidad}
                            className="w-full h-11 border-2 border-emerald-200 hover:border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        >
                            + Agregar a la lista
                        </Button>
                    </div>
                </div>
            </div>

            {/* Right Column: Pending Items Table */}
            <div className="lg:col-span-2 flex flex-col h-full space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col flex-1 overflow-hidden min-h-[400px]">
                    <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">3</span>
                            Lista de Productos ({pendingItems.length})
                        </h2>
                        {pendingItems.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setPendingItems([])}
                                className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                            >
                                Vaciar lista
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-0">
                        {pendingItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16 px-4 text-center">
                                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 border border-gray-100">
                                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 font-medium">Aún no has agregado productos</p>
                                <p className="text-sm mt-1">Busca un producto y presiona "Agregar a la lista"</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 shadow-sm z-10">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Producto
                                        </th>
                                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Cantidad
                                        </th>
                                        <th className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                                            Acción
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {pendingItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="px-5 py-4 text-sm">
                                                <div className="font-medium text-gray-900">{item.product.name}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    {item.product.brand && <span className="font-medium">{item.product.brand}</span>}
                                                    {item.product.brand && <span className="mx-1">•</span>}
                                                    <span>{item.product.category}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-right">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50">
                                                    <span className="text-emerald-700 font-semibold mr-1">
                                                        +{item.cantidad}
                                                    </span>
                                                    <span className="text-emerald-600/70 font-medium text-xs">
                                                        {item.product.baseUnit}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFromList(item.id)}
                                                    className="inline-flex items-center justify-center p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-200"
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
                    className="w-full h-14 text-lg font-medium shadow-md shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 focus:ring-offset-2 transition-all"
                >
                    {isSubmitting ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Procesando...
                        </span>
                    ) : (
                        'Confirmar y Registrar'
                    )}
                </Button>
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
        </div>
    );
}

// ============================================================
// TAB 2: Recepciones Pendientes
// ============================================================
type PendingOrder = {
    _id: Id<"supplier_orders">;
    providerName?: string;
    status: "pendiente" | "recibido" | "cancelado";
    totalItems: number;
    notes?: string;
    createdAt: number;
    itemCount: number;
    previewProducts: string[];
};

function RecepcionesPendientesView() {
    const pendingOrders = useQuery(api.procurement.listPendingOrders, { destinationFilter: 'cafetin' });
    const [selectedOrderId, setSelectedOrderId] = useState<Id<"supplier_orders"> | null>(null);

    if (pendingOrders === undefined) {
        return <ProductListSkeleton count={3} />;
    }

    if (pendingOrders.length === 0) {
        return (
            <EmptyState
                title="Sin pedidos pendientes"
                message="No hay pedidos de WhatsApp al proveedor de Cafetín esperando recepción."
            />
        );
    }

    return (
        <div className="space-y-4 max-w-4xl mx-auto">
            {pendingOrders.map((order) => (
                <div
                    key={order._id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all group"
                    onClick={() => setSelectedOrderId(order._id)}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1.5">
                                <h3 className="text-base font-semibold text-gray-900">
                                    Pedido del {new Date(order.createdAt).toLocaleDateString('es-VE', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </h3>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                    En tránsito
                                </span>
                            </div>

                            <p className="text-sm text-gray-600 flex items-center gap-2">
                                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                <span className="font-medium text-gray-900">{order.itemCount}</span> {order.itemCount === 1 ? 'producto' : 'productos'} solicitados
                            </p>

                            <div className="mt-3 flex gap-2">
                                {order.previewProducts.map((p, i) => (
                                    <span key={i} className="inline-flex px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200 truncate max-w-[150px]">
                                        {p}
                                    </span>
                                ))}
                                {order.itemCount > 3 && (
                                    <span className="inline-flex px-2 py-1 bg-gray-50 text-gray-500 text-xs rounded border border-gray-100">
                                        +{order.itemCount - 3} más
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                            <Button
                                variant="primary"
                                onClick={(e) => { e.stopPropagation(); setSelectedOrderId(order._id); }}
                                className="w-full sm:w-auto shadow-sm bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500 group-hover:scale-[1.02] transition-transform"
                            >
                                Recepcionar
                            </Button>
                        </div>
                    </div>
                </div>
            ))}

            {/* Receive Modal */}
            {selectedOrderId && (
                <ReceiveOrderModal
                    orderId={selectedOrderId}
                    onClose={() => setSelectedOrderId(null)}
                />
            )}
        </div>
    );
}

// ============================================================
// Receive Order Modal (Reused design from Admin but targeted for Cafetin)
// ============================================================

type ProductWithStock = ConvexProduct; // Extends basic product type

function ReceiveOrderModal({
    orderId,
    onClose,
}: {
    orderId: Id<"supplier_orders">;
    onClose: () => void;
}) {
    const orderData = useQuery(api.procurement.getOrderWithItems, { orderId });
    const allProducts = useQuery(api.products.listWithInventory);
    const receiveOrder = useMutation(api.procurement.receiveOrder);
    const cancelOrder = useMutation(api.procurement.cancelOrder);

    const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
    const [extraItems, setExtraItems] = useState<ProductWithStock[]>([]);
    const [extraQuantities, setExtraQuantities] = useState<Record<string, number>>({});

    // Adding products state
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{
        message: string;
        type: 'success' | 'error' | 'info';
        isOpen: boolean;
    }>({ message: '', type: 'info', isOpen: false });

    // Initialize quantities when data loads
    useMemo(() => {
        if (orderData?.items) {
            const initial: Record<string, number> = {};
            for (const item of orderData.items) {
                if (initial[item._id] === undefined) {
                    initial[item._id] = item.cantidadSolicitada;
                }
            }
            setReceivedQuantities(prev => ({ ...initial, ...prev }));
        }
    }, [orderData?.items]);

    const handleQuantityChange = (itemId: string, value: number) => {
        setReceivedQuantities((prev) => ({
            ...prev,
            [itemId]: Math.max(0, value),
        }));
    };

    const handleExtraQuantityChange = (productId: string, value: number) => {
        setExtraQuantities((prev) => ({
            ...prev,
            [productId]: Math.max(0, value),
        }));
    };

    const handleRemoveItem = (itemId: string) => {
        setReceivedQuantities(prev => ({
            ...prev,
            [itemId]: 0
        }));
        setToast({ message: "Item marcado como no recibido (0)", type: "info", isOpen: true });
    };

    const handleRemoveExtraItem = (productId: string) => {
        setExtraItems(prev => prev.filter(p => p._id !== productId));
        const newQuantities = { ...extraQuantities };
        delete newQuantities[productId];
        setExtraQuantities(newQuantities);
    };

    const filteredProducts = useMemo(() => {
        if (!allProducts || !searchQuery) return [];
        const normalizedQuery = normalizeSearchText(searchQuery);
        return allProducts
            .filter((p: any) => {
                const inOriginal = orderData?.items.some(item => item.product?._id === p._id);
                const inExtra = extraItems.some(extra => extra._id === p._id);
                if (inOriginal || inExtra) return false;

                // Only suggest cafetin products or milk
                const isCafetin = p.category.toLowerCase().includes('cafetin');
                const isMilk = p.name.toLowerCase().includes('leche');
                if (!isCafetin && !isMilk) return false;

                return normalizeSearchText(p.name).includes(normalizedQuery);
            })
            .slice(0, 5) as ProductWithStock[];
    }, [allProducts, searchQuery, orderData?.items, extraItems]);

    const handleAddProduct = (product: ProductWithStock) => {
        setExtraItems(prev => [...prev, product]);
        setExtraQuantities(prev => ({ ...prev, [product._id]: 1 }));
        setSearchQuery("");
        setIsAddingProduct(false);
    };

    const handleConfirm = async () => {
        if (!orderData?.items) return;

        setIsSubmitting(true);
        try {
            await receiveOrder({
                supplierOrderId: orderId,
                items: orderData.items.map((item) => ({
                    itemId: item._id,
                    productId: item.productId,
                    cantidadRecibida: receivedQuantities[item._id] ?? item.cantidadSolicitada,
                })),
                extraItems: extraItems.map(p => ({
                    productId: p._id,
                    cantidadRecibida: extraQuantities[p._id] || 0
                })),
            });

            setToast({
                message: 'Inventario de Cafetín actualizado correctamente',
                type: 'success',
                isOpen: true,
            });

            setTimeout(() => onClose(), 1500);
        } catch (error) {
            console.error('Error receiving order:', error);
            setToast({
                message: 'Error al procesar la recepción. Intente de nuevo.',
                type: 'error',
                isOpen: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!window.confirm('¿Está seguro de que desea cancelar este pedido? No se podrá recuperar.')) return;

        setIsSubmitting(true);
        try {
            await cancelOrder({ orderId });
            setToast({
                message: 'Pedido cancelado correctamente',
                type: 'success',
                isOpen: true,
            });
            setTimeout(() => onClose(), 1500);
        } catch (error) {
            console.error('Error canceling order:', error);
            setToast({
                message: 'Error al cancelar el pedido',
                type: 'error',
                isOpen: true,
            });
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Recepcionar Pedido a Cafetín">
            {!orderData ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                    <span className="text-gray-500 font-medium">Cargando detalles del pedido...</span>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Header Summary */}
                    <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-base font-semibold text-gray-900 leading-tight">
                                    Recepción de Mercancía
                                </h3>
                                <p className="text-sm text-emerald-800 mt-1">
                                    Pedido generado el {new Date(orderData.createdAt).toLocaleDateString('es-VE', {
                                        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                                    })}
                                </p>
                                <div className="mt-2 text-xs text-emerald-600/80 p-2 bg-emerald-100/50 rounded-md inline-block">
                                    <span className="font-semibold">Importante:</span> El stock se sumará al inventario directo de Cafetín.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2 flex items-center justify-between">
                            <span>Productos Solicitados ({orderData.items.length})</span>
                            <span className="text-xs font-normal text-gray-500">Ajusta la cantidad recibida si difiere</span>
                        </h4>

                        <div className="divide-y divide-gray-100 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            {orderData.items.map((item) => {
                                const qty = receivedQuantities[item._id] ?? item.cantidadSolicitada;
                                const isZero = qty === 0;
                                const hasDifference = qty !== item.cantidadSolicitada;

                                return (
                                    <div key={item._id} className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${isZero ? 'bg-red-50/30' : 'hover:bg-gray-50/50'}`}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className={`text-sm font-medium truncate ${isZero ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                                    {item.product?.name || 'Producto Desconocido'}
                                                </p>
                                                {hasDifference && !isZero && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                                                        Modificado
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Solicitado: <span className="font-medium">{item.cantidadSolicitada}</span> {item.product?.purchaseUnit}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-auto justify-end">
                                            <div className="w-32">
                                                <QuantityInput
                                                    value={qty}
                                                    onChange={(value) => handleQuantityChange(item._id, value)}
                                                    min={0}
                                                    unit={item.product?.purchaseUnit || ''}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(item._id)}
                                                className={`p-2 rounded-full transition-colors flex-shrink-0 ${isZero ? 'text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-600' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                                                title={isZero ? "Restaurar cantidad original" : "Marcar como no recibido (0)"}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    {isZero ? (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    ) : (
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    )}
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Extra Items Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                            <h4 className="font-semibold text-gray-900">
                                Productos Extra <span className="text-gray-500 font-normal">({extraItems.length})</span>
                            </h4>
                            {!isAddingProduct && (
                                <button
                                    type="button"
                                    onClick={() => setIsAddingProduct(true)}
                                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Agregar Extra
                                </button>
                            )}
                        </div>

                        {isAddingProduct && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-inner">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Buscar producto y agregarlo</label>
                                <div className="space-y-2 relative">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Escribe el nombre del producto..."
                                            className="block w-full pl-10 h-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                            autoFocus
                                        />
                                    </div>

                                    {searchQuery && (
                                        <div className="bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto w-full z-10 p-1">
                                            {filteredProducts.length === 0 ? (
                                                <div className="p-3 text-sm text-gray-500 text-center">
                                                    No se encontraron productos de Cafetín. Intenta con otro término.
                                                </div>
                                            ) : (
                                                filteredProducts.map(p => (
                                                    <button
                                                        key={p._id}
                                                        type="button"
                                                        onClick={() => handleAddProduct(p)}
                                                        className="w-full text-left p-3 hover:bg-emerald-50 rounded-md flex items-center justify-between group transition-colors"
                                                    >
                                                        <div>
                                                            <div className="font-medium text-gray-900 group-hover:text-emerald-700">{p.name}</div>
                                                            <div className="text-xs text-gray-500">{p.brand}</div>
                                                        </div>
                                                        <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded hidden group-hover:inline-block">
                                                            Añadir
                                                        </span>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => { setIsAddingProduct(false); setSearchQuery(''); }}
                                        className="text-sm font-medium text-gray-500 hover:text-gray-700 bg-white border border-gray-300 px-3 py-1.5 rounded-md shadow-sm"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}

                        {extraItems.length > 0 && (
                            <div className="divide-y divide-gray-100 bg-white rounded-lg border border-emerald-200 shadow-sm overflow-hidden">
                                {extraItems.map((p) => (
                                    <div key={p._id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-emerald-50/30 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-medium text-emerald-900 truncate">
                                                    {p.name}
                                                </p>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                                                    Extra
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {p.brand} • {p.category}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-auto justify-end">
                                            <div className="w-32">
                                                <QuantityInput
                                                    value={extraQuantities[p._id] || 0}
                                                    onChange={(value) => handleExtraQuantityChange(p._id, value)}
                                                    min={1}
                                                    unit={p.purchaseUnit}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveExtraItem(p._id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {extraItems.length === 0 && !isAddingProduct && (
                            <div className="text-sm text-gray-500 italic py-2 text-center border border-dashed border-gray-200 rounded-lg bg-gray-50">
                                No se reportan productos adicionales en esta entrega.
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleCancelOrder}
                            disabled={isSubmitting}
                            className="text-red-600 hover:text-red-800 text-sm font-medium w-full sm:w-auto px-4 py-2 hover:bg-red-50 rounded-md transition-colors"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Cancelar Pedido
                            </span>
                        </button>
                        <div className="flex w-full sm:w-auto gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none border-gray-300 hover:bg-gray-50 text-gray-700"
                            >
                                Volver
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={handleConfirm}
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none min-w-[140px] bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isSubmitting ? 'Guardando...' : 'Confirmar Recepción'}
                            </Button>
                        </div>
                    </div>

                    <Toast
                        message={toast.message}
                        type={toast.type}
                        isOpen={toast.isOpen}
                        onClose={() => setToast({ ...toast, isOpen: false })}
                    />
                </div>
            )}
        </Modal>
    );
}

export default function CafetinIngresoPage() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />
            <PageContainer>
                <Suspense fallback={
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                    </div>
                }>
                    <CafetinIngresoContent />
                </Suspense>
            </PageContainer>
        </div>
    );
}

