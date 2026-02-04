'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductListSkeleton } from '@/components/ui/SkeletonLoader';
import { pluralizeUnit, normalizeSearchText } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/useDebounce';

type Tab = 'crear' | 'recibir';

export default function AbastecimientoPage() {
    const [activeTab, setActiveTab] = useState<Tab>('crear');

    return (
        <PageContainer>
            <AdminHeader
                title="Abastecimiento"
                subtitle="Gestión de pedidos a proveedores"
            />

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('crear')}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${activeTab === 'crear'
                        ? 'text-emerald-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Nuevo Pedido
                    {activeTab === 'crear' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('recibir')}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${activeTab === 'recibir'
                        ? 'text-emerald-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Recepciones Pendientes
                    {activeTab === 'recibir' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                    )}
                </button>
            </div>

            {activeTab === 'crear' ? <CrearPedidoView /> : <RecepcionesPendientesView />}
        </PageContainer>
    );
}

// ============================================================
// TAB 1: Crear Pedido
// ============================================================

type ProductWithStock = {
    _id: Id<"products">;
    name: string;
    brand: string;
    category: string;
    baseUnit: string;
    purchaseUnit: string;
    conversionFactor: number;
    active: boolean;
    totalStock: number;
    stockAlmacen: number;
};

function CrearPedidoView() {
    const products = useQuery(api.products.listWithInventory);
    const createOrder = useMutation(api.procurement.createOrder);

    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    const [summaryExpanded, setSummaryExpanded] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [toast, setToast] = useState<{
        message: string;
        type: 'success' | 'error' | 'info';
        isOpen: boolean;
    }>({ message: '', type: 'info', isOpen: false });

    // Filter active products, excluding Cafetin
    const activeProducts = useMemo(() => {
        if (!products) return [];
        return products.filter((p: ProductWithStock) => {
            const isCafetin = p.category.toLowerCase().includes('cafetin') || p.category.toLowerCase().includes('cafetín');
            return p.active && !isCafetin;
        });
    }, [products]);

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set<string>();
        activeProducts.forEach((p: ProductWithStock) => cats.add(p.category));
        return Array.from(cats).sort();
    }, [activeProducts]);

    // Filter by search and category
    const filteredProducts = useMemo(() => {
        let filtered = activeProducts;

        // Category filter
        if (selectedCategory !== 'all') {
            filtered = filtered.filter((p: ProductWithStock) => p.category === selectedCategory);
        }

        // Search filter
        if (debouncedSearch) {
            filtered = filtered.filter((p: ProductWithStock) =>
                normalizeSearchText(p.name).includes(normalizeSearchText(debouncedSearch)) ||
                normalizeSearchText(p.category).includes(normalizeSearchText(debouncedSearch))
            );
        }

        return filtered;
    }, [activeProducts, debouncedSearch, selectedCategory]);

    // Group by category
    const productsByCategory = useMemo(() => {
        const grouped: Record<string, ProductWithStock[]> = {};
        for (const product of filteredProducts) {
            if (!grouped[product.category]) {
                grouped[product.category] = [];
            }
            grouped[product.category].push(product);
        }
        // Sort products within each category
        for (const category of Object.keys(grouped)) {
            grouped[category].sort((a, b) => a.name.localeCompare(b.name, 'es'));
        }

        // Initialize expanded state for new categories (default: expanded)
        const newExpanded = { ...expandedCategories };
        Object.keys(grouped).forEach(category => {
            if (!(category in newExpanded)) {
                newExpanded[category] = true;
            }
        });
        if (Object.keys(newExpanded).length !== Object.keys(expandedCategories).length) {
            setExpandedCategories(newExpanded);
        }

        return grouped;
    }, [filteredProducts, expandedCategories]);

    const handleQuantityChange = (productId: string, value: number) => {
        setQuantities((prev) => ({
            ...prev,
            [productId]: Math.max(0, value),
        }));
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    // Selected items for the order
    const selectedItems = useMemo(() => {
        return Object.entries(quantities)
            .filter(([_, qty]) => qty > 0)
            .map(([productId, qty]) => {
                const product = activeProducts.find((p: ProductWithStock) => p._id === productId);
                return product ? { product, cantidad: qty } : null;
            })
            .filter(Boolean) as Array<{ product: ProductWithStock; cantidad: number }>;
    }, [quantities, activeProducts]);

    const generateWhatsAppMessage = () => {
        if (selectedItems.length === 0) return '';

        const lines = selectedItems.map(
            (item) => `- ${item.cantidad} ${item.product.purchaseUnit} de ${item.product.name}`
        );
        return `Hola, nuevo pedido:\n${lines.join('\n')}`;
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            setToast({
                message: 'Debe seleccionar al menos un producto',
                type: 'error',
                isOpen: true,
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // Save order to DB
            await createOrder({
                items: selectedItems.map((item) => ({
                    productId: item.product._id,
                    cantidad: item.cantidad,
                })),
            });

            // Generate WhatsApp link
            const message = generateWhatsAppMessage();
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');

            setToast({
                message: 'Pedido guardado. Se abrió WhatsApp para enviar.',
                type: 'success',
                isOpen: true,
            });

            // Clear form
            setQuantities({});
        } catch (error) {
            console.error('Error creating order:', error);
            setToast({
                message: 'Error al crear el pedido. Intente de nuevo.',
                type: 'error',
                isOpen: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (products === undefined) {
        return <ProductListSkeleton count={6} />;
    }

    return (
        <div className="space-y-4 pb-24">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 space-y-3">
                {/* Search */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${selectedCategory === 'all'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                            }`}
                    >
                        Todas
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${selectedCategory === cat
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Filter Status */}
                {(searchQuery || selectedCategory !== 'all') && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                        </span>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('all');
                            }}
                            className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                )}
            </div>

            {/* Product List with Collapsible Categories */}
            {Object.keys(productsByCategory).length === 0 ? (
                <EmptyState
                    title="No hay productos"
                    message={searchQuery ? 'No se encontraron productos con ese nombre.' : 'No hay productos disponibles.'}
                />
            ) : (
                Object.entries(productsByCategory).map(([category, categoryProducts]) => {
                    const isExpanded = expandedCategories[category] !== false;
                    return (
                        <div key={category} className="mb-4">
                            {/* Category Header - Collapsible */}
                            <button
                                type="button"
                                onClick={() => toggleCategory(category)}
                                className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2 hover:text-gray-900 transition-colors w-full text-left"
                            >
                                <svg
                                    className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                                <span>{category}</span>
                                <span className="text-xs font-normal text-gray-400">
                                    ({categoryProducts.length})
                                </span>
                            </button>

                            {/* Category Products */}
                            {isExpanded && (
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
                                    {categoryProducts.map((product) => (
                                        <div
                                            key={product._id}
                                            className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {product.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    1 {product.purchaseUnit} = {product.conversionFactor} {product.baseUnit}
                                                    <span className="mx-1">·</span>
                                                    Stock: {product.stockAlmacen} {product.baseUnit}
                                                </p>
                                            </div>
                                            <QuantityInput
                                                value={quantities[product._id] || 0}
                                                onChange={(value) => handleQuantityChange(product._id, value)}
                                                min={0}
                                                unit={product.purchaseUnit}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {/* Fixed Bottom Bar with Dropdown */}
            {selectedItems.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-50">
                    <div className="max-w-4xl mx-auto flex items-center gap-4">
                        {/* Selected Products Dropdown */}
                        <div className="relative flex-1">
                            <button
                                type="button"
                                onClick={() => setSummaryExpanded(!summaryExpanded)}
                                className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-900">Seleccionados</span>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                                        {selectedItems.length}
                                    </span>
                                </div>
                                <svg
                                    className={`w-5 h-5 text-gray-400 transition-transform ${summaryExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Content */}
                            {summaryExpanded && (
                                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-10">
                                    <div className="p-3 space-y-2">
                                        {selectedItems.map((item) => (
                                            <div
                                                key={item.product._id}
                                                className="flex items-center justify-between bg-gray-50 rounded-lg p-2 border border-gray-200"
                                            >
                                                <span className="text-sm font-medium text-gray-900 truncate flex-1 mr-2">
                                                    {item.product.name}
                                                </span>
                                                <span className="text-sm text-gray-600 whitespace-nowrap">
                                                    {item.cantidad} {pluralizeUnit(item.product.purchaseUnit, item.cantidad)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            variant="primary"
                            className="flex items-center gap-2 whitespace-nowrap"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            {isSubmitting ? 'Enviando...' : 'WhatsApp'}
                        </Button>
                    </div>
                </div>
            )}

            <Toast
                message={toast.message}
                type={toast.type}
                isOpen={toast.isOpen}
                onClose={() => setToast({ ...toast, isOpen: false })}
            />
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
    const pendingOrders = useQuery(api.procurement.listPendingOrders);
    const [selectedOrderId, setSelectedOrderId] = useState<Id<"supplier_orders"> | null>(null);

    if (pendingOrders === undefined) {
        return <ProductListSkeleton count={3} />;
    }

    if (pendingOrders.length === 0) {
        return (
            <EmptyState
                title="Sin pedidos pendientes"
                message="No hay pedidos de proveedor esperando recepción."
            />
        );
    }

    return (
        <div className="space-y-3">
            {pendingOrders.map((order) => (
                <div
                    key={order._id}
                    onClick={() => setSelectedOrderId(order._id)}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                                Pedido del {new Date(order.createdAt).toLocaleDateString('es-VE', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {order.itemCount} {order.itemCount === 1 ? 'producto' : 'productos'}
                                {order.providerName && ` · ${order.providerName}`}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 truncate">
                                {order.previewProducts.join(', ')}
                            </p>
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Pendiente
                        </span>
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
// Receive Order Modal
// ============================================================

function ReceiveOrderModal({
    orderId,
    onClose,
}: {
    orderId: Id<"supplier_orders">;
    onClose: () => void;
}) {
    const orderData = useQuery(api.procurement.getOrderWithItems, { orderId });
    const receiveOrder = useMutation(api.procurement.receiveOrder);

    const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});
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
                initial[item._id] = item.cantidadSolicitada;
            }
            setReceivedQuantities(initial);
        }
    }, [orderData?.items]);

    const handleQuantityChange = (itemId: string, value: number) => {
        setReceivedQuantities((prev) => ({
            ...prev,
            [itemId]: Math.max(0, value),
        }));
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
            });

            setToast({
                message: 'Inventario actualizado correctamente',
                type: 'success',
                isOpen: true,
            });

            // Close after brief delay
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

    return (
        <Modal isOpen={true} onClose={onClose} title="Confirmar Recepción">
            {!orderData ? (
                <div className="py-8 text-center text-gray-500">Cargando...</div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Verifique las cantidades recibidas. Puede ajustar si llegó menos de lo solicitado.
                    </p>

                    <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                        {orderData.items.map((item) => (
                            <div
                                key={item._id}
                                className="bg-gray-50 rounded-lg p-3 flex items-center justify-between gap-3"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {item.product?.name || 'Producto desconocido'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Solicitado: {item.cantidadSolicitada} {item.product?.purchaseUnit}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <label className="text-xs text-gray-500 block mb-1">Recibido:</label>
                                    <QuantityInput
                                        value={receivedQuantities[item._id] ?? item.cantidadSolicitada}
                                        onChange={(value) => handleQuantityChange(item._id, value)}
                                        min={0}
                                        unit={item.product?.purchaseUnit}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirm}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Procesando...' : 'Confirmar Ingreso a Inventario'}
                        </Button>
                    </div>
                </div>
            )}

            <Toast
                message={toast.message}
                type={toast.type}
                isOpen={toast.isOpen}
                onClose={() => setToast({ ...toast, isOpen: false })}
            />
        </Modal>
    );
}
