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
    stockMinimoAlmacen: number;
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
    const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'none'>('all');
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

    // Filter by search and stock status
    const filteredProducts = useMemo(() => {
        let filtered = activeProducts;

        // Stock filter
        if (stockFilter === 'low') {
            filtered = filtered.filter((p: ProductWithStock) => p.stockAlmacen <= p.stockMinimoAlmacen);
        } else if (stockFilter === 'none') {
            filtered = filtered.filter((p: ProductWithStock) => p.stockAlmacen === 0);
        }

        // Search filter
        if (debouncedSearch) {
            filtered = filtered.filter((p: ProductWithStock) =>
                normalizeSearchText(p.name).includes(normalizeSearchText(debouncedSearch)) ||
                normalizeSearchText(p.category).includes(normalizeSearchText(debouncedSearch))
            );
        }

        return filtered;
    }, [activeProducts, debouncedSearch, stockFilter]);

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
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base"
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

                {/* Stock Filters - Mobile Optimized */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setStockFilter('all')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5 ${stockFilter === 'all'
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                            }`}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setStockFilter('low')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5 ${stockFilter === 'low'
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                            }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${stockFilter === 'low' ? 'bg-amber-400' : 'bg-amber-500'}`}></span>
                        Bajo
                    </button>
                    <button
                        onClick={() => setStockFilter('none')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5 ${stockFilter === 'none'
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                            }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${stockFilter === 'none' ? 'bg-red-400' : 'bg-red-500'}`}></span>
                        Sin Stock
                    </button>
                </div>

                {/* Filter Status */}
                {(searchQuery || stockFilter !== 'all') && (
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-500 truncate mr-2">
                            {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                        </span>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setStockFilter('all');
                            }}
                            className="text-emerald-600 hover:text-emerald-700 font-medium whitespace-nowrap"
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
                                            className="p-3 flex items-start sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors flex-col sm:flex-row"
                                        >
                                            <div className="flex-1 min-w-0 w-full sm:w-auto">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {product.name}
                                                    </p>
                                                    {product.stockAlmacen <= product.stockMinimoAlmacen && (
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${product.stockAlmacen === 0 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                                            {product.stockAlmacen === 0 ? 'Sin Stock' : 'Bajo'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-x-2 gap-y-1 text-xs text-gray-500 flex-wrap">
                                                    <span>
                                                        Stock: {product.stockAlmacen} {product.baseUnit}
                                                    </span>
                                                    <span className="hidden sm:inline">·</span>
                                                    <span className="text-gray-400">
                                                        (1 {product.purchaseUnit} = {product.conversionFactor} {product.baseUnit})
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full sm:w-auto flex justify-end">
                                                <QuantityInput
                                                    value={quantities[product._id] || 0}
                                                    onChange={(value) => handleQuantityChange(product._id, value)}
                                                    min={0}
                                                    unit={product.purchaseUnit}
                                                />
                                            </div>
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
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-3 z-30 safe-area-bottom">
                    <div className="max-w-4xl mx-auto flex items-center gap-3">
                        {/* Selected Products Dropdown */}
                        <div className="relative flex-1 min-w-0">
                            <button
                                type="button"
                                onClick={() => setSummaryExpanded(!summaryExpanded)}
                                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <span className="text-sm font-medium text-gray-900">Seleccionados</span>
                                    <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                                        {selectedItems.length}
                                    </span>
                                </div>
                                <svg
                                    className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ml-2 ${summaryExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown Content */}
                            {summaryExpanded && (
                                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-[50vh] overflow-y-auto z-40">
                                    <div className="p-2 space-y-2">
                                        {selectedItems.map((item) => (
                                            <div
                                                key={item.product._id}
                                                className="flex items-center justify-between bg-gray-50 rounded p-2 text-sm border border-gray-100"
                                            >
                                                <div className="flex-1 min-w-0 mr-2">
                                                    <span className="font-medium text-gray-900 block truncate">
                                                        {item.product.name}
                                                    </span>
                                                </div>
                                                <span className="font-semibold text-emerald-700 whitespace-nowrap bg-emerald-50 px-2 py-0.5 rounded text-xs">
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
                            className="flex items-center gap-2 whitespace-nowrap px-4 py-2 h-auto text-sm"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            {isSubmitting ? '...' : 'WhatsApp'}
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
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => setSelectedOrderId(order._id)}
                        >
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
                        <div className="flex flex-col items-end gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Pendiente
                            </span>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const dateStr = new Date(order.createdAt).toLocaleDateString('es-VE', {
                                        day: 'numeric',
                                        month: 'long'
                                    });
                                    const message = `Hola, quisiera hacer seguimiento al pedido realizado el ${dateStr} con ${order.itemCount} productos.`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                                }}
                                className="h-8 px-3 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                            >
                                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                Seguimiento
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
// Receive Order Modal
// ============================================================

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
    const allProducts = useQuery(api.products.listWithInventory);
    const receiveOrder = useMutation(api.procurement.receiveOrder);

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
                // If we already have a value (e.g. from user edit), keep it.
                // Otherwise default to requested quantity.
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
        // For original items, we just set quantity to 0
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
            .filter((p: ProductWithStock) => {
                // Exclude if already in original order or extra items
                const inOriginal = orderData?.items.some(item => item.product?._id === p._id);
                const inExtra = extraItems.some(extra => extra._id === p._id);
                if (inOriginal || inExtra) return false;

                return normalizeSearchText(p.name).includes(normalizedQuery);
            })
            .slice(0, 5);
    }, [allProducts, searchQuery, orderData?.items, extraItems]);

    const handleAddProduct = (product: ProductWithStock) => {
        setExtraItems(prev => [...prev, product]);
        setExtraQuantities(prev => ({ ...prev, [product._id]: 1 })); // Default to 1
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
                <div className="space-y-5">
                    {/* Order Summary Header */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">
                                    Pedido del {new Date(orderData.createdAt).toLocaleDateString('es-VE', {
                                        day: 'numeric',
                                        month: 'long',
                                    })}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {orderData.items.length} {orderData.items.length === 1 ? 'producto' : 'productos'} solicitados
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Verifique las cantidades recibidas. Ajuste si llegó menos o agregue productos extra.
                        </p>
                    </div>

                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                        {/* Section Label */}
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Productos del Pedido</span>
                            <div className="flex-1 h-px bg-gray-200"></div>
                        </div>

                        {/* Original Items - Vertical Card Layout */}
                        {orderData.items.map((item) => {
                            const isZero = receivedQuantities[item._id] === 0;
                            const received = receivedQuantities[item._id] ?? item.cantidadSolicitada;
                            const hasDiff = received !== item.cantidadSolicitada;

                            return (
                                <div
                                    key={item._id}
                                    className={`rounded-xl border p-4 transition-colors ${isZero
                                        ? 'bg-red-50/60 border-red-200'
                                        : hasDiff
                                            ? 'bg-amber-50/40 border-amber-200'
                                            : 'bg-white border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    {/* Product Name Row */}
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <p className={`text-base font-semibold leading-snug ${isZero ? 'text-gray-400 line-through' : 'text-gray-900'
                                            }`}>
                                            {item.product?.name || 'Producto desconocido'}
                                        </p>
                                        <button
                                            onClick={() => handleRemoveItem(item._id)}
                                            className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${isZero
                                                ? 'text-red-300'
                                                : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                                                }`}
                                            title="Marcar como no recibido"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* Quantities Row */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-100 rounded-lg px-3 py-1.5">
                                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide block leading-tight">Pedido</span>
                                                <span className="text-sm font-bold text-gray-700">
                                                    {item.cantidadSolicitada} <span className="text-xs font-normal text-gray-500">{item.product?.purchaseUnit}</span>
                                                </span>
                                            </div>
                                            <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide block leading-tight mb-0.5">Recibido</span>
                                            <QuantityInput
                                                value={received}
                                                onChange={(value) => handleQuantityChange(item._id, value)}
                                                min={0}
                                                unit={item.product?.purchaseUnit}
                                            />
                                        </div>
                                    </div>

                                    {/* Diff indicator */}
                                    {hasDiff && !isZero && (
                                        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                            <span>Cantidad diferente al pedido original</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Extra Items Section */}
                        {extraItems.length > 0 && (
                            <>
                                <div className="flex items-center gap-2 px-1 pt-2">
                                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Productos Adicionales</span>
                                    <div className="flex-1 h-px bg-emerald-200"></div>
                                </div>

                                {extraItems.map((product) => (
                                    <div
                                        key={product._id}
                                        className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
                                    >
                                        {/* Product Name Row */}
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-base font-semibold text-gray-900 leading-snug">
                                                    {product.name}
                                                </p>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                                                    Extra
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveExtraItem(product._id)}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                                title="Eliminar"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Quantity Input */}
                                        <div className="flex items-center justify-end">
                                            <div>
                                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide block leading-tight mb-0.5">Recibido</span>
                                                <QuantityInput
                                                    value={extraQuantities[product._id] || 0}
                                                    onChange={(value) => handleExtraQuantityChange(product._id, value)}
                                                    min={0}
                                                    unit={product.purchaseUnit}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* Add Product Section */}
                        <div className="pt-2">
                            {!isAddingProduct ? (
                                <button
                                    onClick={() => setIsAddingProduct(true)}
                                    className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 px-3 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors w-full justify-center border-2 border-dashed border-emerald-300"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Agregar producto adicional
                                </button>
                            ) : (
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Buscar producto</label>
                                        <button
                                            onClick={() => setIsAddingProduct(false)}
                                            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Escribe para buscar..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                    {searchQuery && (
                                        <div className="bg-white border border-gray-100 rounded-lg shadow-sm max-h-40 overflow-y-auto">
                                            {filteredProducts.length > 0 ? (
                                                filteredProducts.map(product => (
                                                    <button
                                                        key={product._id}
                                                        onClick={() => handleAddProduct(product)}
                                                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-emerald-50 flex items-center justify-between group border-b border-gray-50 last:border-0"
                                                    >
                                                        <span className="font-medium text-gray-900">{product.name}</span>
                                                        <span className="text-xs text-gray-400 group-hover:text-emerald-600 font-medium">+ Agregar</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-3 py-3 text-sm text-gray-500 text-center">No se encontraron productos</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-200">
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="w-full sm:flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirm}
                            disabled={isSubmitting}
                            className="w-full sm:flex-1"
                        >
                            {isSubmitting ? 'Procesando...' : '✓ Confirmar Recepción'}
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
