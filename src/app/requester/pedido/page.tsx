'use client';

import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { ProductListSkeleton } from '@/components/ui/SkeletonLoader';
import { EmptyState, EmptySearchResultsState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/layout/PageContainer';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { setUserArea, getUserArea } from '@/lib/auth';
import { pluralizeUnit, normalizeSearchText } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useInventorySync } from '@/lib/hooks/useInventorySync';
import { useInventoryData } from '@/lib/hooks/useInventoryData';
import { useOfflineMutation } from '@/lib/hooks/useOfflineMutation';
import { Area } from '@/types';

const validAreas: Area[] = ['Cocina', 'Cafetin', 'Limpieza', 'Las casas'];

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

/** Unidad a mostrar en el pedido: compra para Cafetin (productos a la venta o leche), base para el resto. */
function getOrderUnit(
  product: { availableForSale?: boolean; baseUnit: string; purchaseUnit: string; category: string; name: string },
  area: Area
): string {
  const isLeche = product.name.toLowerCase().includes('leche');
  if (area === "Cafetin" && (product.category === 'Cafetin' || product.category === 'cafetin' || isLeche) && product.availableForSale !== false) {
    return product.purchaseUnit;
  }
  return product.baseUnit;
}

/** Convierte cantidad ingresada (en unidad de visualización) a cantidad en unidad base para el backend. */
function toBaseUnitQuantity(
  product: { availableForSale?: boolean; conversionFactor: number; category: string; name: string },
  displayQty: number,
  area: Area
): number {
  const isLeche = product.name.toLowerCase().includes('leche');
  if (area === "Cafetin" && (product.category === 'Cafetin' || product.category === 'cafetin' || isLeche) && product.availableForSale !== false) {
    return displayQty * product.conversionFactor;
  }
  return displayQty;
}

function CreateOrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get area from URL query param, localStorage, or default to 'Cocina'
  const areaFromUrl = searchParams?.get('area');
  const areaFromStorage = getUserArea();
  const initialArea: Area = (areaFromUrl && validAreas.includes(areaFromUrl as Area))
    ? (areaFromUrl as Area)
    : (areaFromStorage || 'Cocina');

  const [selectedArea, setSelectedArea] = useState<Area>(initialArea);

  // Sincronizar datos de Convex al store de Zustand
  useInventorySync();

  // Obtener datos híbridos (Convex o cache)
  const products = useInventoryData();
  // Use offline-aware mutation for createOrder
  const createOrder = useOfflineMutation('createOrder');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
  }>({
    message: '',
    type: 'info',
    isOpen: false,
  });
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSummaryExpanded(false);
      }
    };

    if (summaryExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [summaryExpanded]);

  // Update area when URL query param changes and save to localStorage
  useEffect(() => {
    const areaFromUrl = searchParams?.get('area');
    const storedArea = getUserArea();

    if (areaFromUrl && validAreas.includes(areaFromUrl as Area)) {
      const area = areaFromUrl as Area;
      setSelectedArea(area);
      setUserArea(area);
    } else if (!areaFromUrl && storedArea) {
      // If no area in URL but we have one in storage, use it
      setSelectedArea(storedArea);
    }
  }, [searchParams]);

  // Listen for area changes from other tabs/windows
  useEffect(() => {
    const handleAreaChange = () => {
      const storedArea = getUserArea();
      if (storedArea && !searchParams?.get('area')) {
        setSelectedArea(storedArea);
      }
    };

    window.addEventListener('userAreaChange', handleAreaChange);
    window.addEventListener('storage', handleAreaChange);

    return () => {
      window.removeEventListener('userAreaChange', handleAreaChange);
      window.removeEventListener('storage', handleAreaChange);
    };
  }, [searchParams]);

  const handleQuantityChange = (productId: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, value),
    }));
  };

  const handleWhatsAppOrder = () => {
    if (selectedProducts.length === 0) return;

    let message = `*Pedido para Cafetín*\n\n`;
    selectedProducts.forEach(p => {
      const unit = getOrderUnit(p, selectedArea);
      const unitPlural = pluralizeUnit(unit, p.cantidad);
      message += `• ${p.cantidad} ${unitPlural} de ${p.name}\n`;
    });

    message += `\nEnviado desde Almacén VC`;

    // Encode for URL
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Use productId directly (backend now supports it). Convert to base unit for backend.
      const orderItems = Object.entries(quantities)
        .filter(([_, displayQty]) => displayQty > 0)
        .map(([productId, displayQty]) => {
          const product = areaProducts.find(p => p._id === productId);
          const cantidadBase = product
            ? toBaseUnitQuantity(product, displayQty, selectedArea)
            : displayQty;
          return {
            productId: productId as Id<"products">,
            cantidad: cantidadBase,
          };
        });

      if (orderItems.length === 0) {
        setToast({
          message: 'Debe seleccionar al menos un producto',
          type: 'error',
          isOpen: true,
        });
        setIsSubmitting(false);
        return;
      }

      // Validate stock before submitting (except for Cafetin - they order directly from supplier)
      const stockErrors: string[] = [];
      if (selectedArea !== 'Cafetin') {
        for (const [productId, displayQty] of Object.entries(quantities)) {
          if (displayQty > 0) {
            const product = areaProducts.find(p => p._id === productId);
            if (product) {
              const cantidadBase = toBaseUnitQuantity(product, displayQty, selectedArea);
              if (cantidadBase > product.stockAlmacen) {
                stockErrors.push(
                  `${product.name}: solicitado ${cantidadBase} ${product.baseUnit}, disponible ${product.stockAlmacen} ${product.baseUnit}`
                );
              }
            }
          }
        }
      }

      if (stockErrors.length > 0) {
        setToast({
          message: `Stock insuficiente:\n${stockErrors.join('\n')}`,
          type: 'error',
          isOpen: true,
        });
        setIsSubmitting(false);
        return;
      }

      const result = await createOrder({
        area: selectedArea,
        items: orderItems,
      });

      // Check if order was queued (offline mode)
      const wasQueued = typeof result === 'object' && 'queued' in result && result.queued;

      // Immediate feedback
      setToast({
        message: wasQueued
          ? 'Pedido guardado (se sincronizará cuando vuelva la conexión)'
          : 'Pedido enviado correctamente',
        type: wasQueued ? 'info' : 'success',
        isOpen: true,
      });
      setIsSubmitting(false);

      // Clear form
      setQuantities({});

      // Optional redirect after 1.5 seconds
      setTimeout(() => {
        router.push('/requester/mis-pedidos');
      }, 1500);
    } catch (err) {
      console.error('Error al crear pedido:', err);
      setToast({
        message: 'No se pudo enviar el pedido. Intente de nuevo.',
        type: 'error',
        isOpen: true,
      });
      setIsSubmitting(false);
    }
  };

  // Filter products by area - show all active products (those without stock will be grayed out)
  const areaProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    // Show all active products (products without stock will be displayed in gray and disabled)
    let filtered = products.filter(p => p.active);

    // For Limpieza area, only show products from Limpieza category
    if (selectedArea === 'Limpieza') {
      filtered = filtered.filter(p => p.category === 'Limpieza');
    } else if (selectedArea === 'Cafetin') {
      // Cafetin primero, luego Cocina y Limpieza (unidad de compra en productos Cafetin; base en Cocina/Limpieza)
      filtered = filtered.filter(p =>
        p.category === 'Cafetin' || p.category === 'cafetin' ||
        p.category === 'Cocina' || p.category === 'Limpieza'
      );
    } else if (selectedArea === 'Cocina' || selectedArea === 'Las casas') {
      // Excluir productos de Cafetin (check both case variants)
      filtered = filtered.filter(p => p.category !== 'Cafetin' && p.category !== 'cafetin');
    }

    return filtered;
  }, [products, selectedArea]);

  // Get all unique subcategories from filtered products
  const subcategories = useMemo(() => {
    if (!areaProducts || areaProducts.length === 0) return [];
    const subcats = new Set<string>();
    areaProducts.forEach(product => {
      if (product.subCategory) {
        subcats.add(product.subCategory);
      }
    });
    return Array.from(subcats).sort();
  }, [areaProducts]);

  // Filter products by search and subcategory
  const filteredProducts = useMemo(() => {
    if (!areaProducts || areaProducts.length === 0) return [];

    return areaProducts.filter(product => {
      // Search filter (using debounced query)
      const matchesSearch = debouncedSearchQuery === '' ||
        normalizeSearchText(product.name).includes(normalizeSearchText(debouncedSearchQuery)) ||
        (product.subCategory && normalizeSearchText(product.subCategory).includes(normalizeSearchText(debouncedSearchQuery)));

      // Subcategory filter
      const matchesSubcategory = selectedSubcategory === 'all' ||
        product.subCategory === selectedSubcategory;

      return matchesSearch && matchesSubcategory;
    });
  }, [areaProducts, debouncedSearchQuery, selectedSubcategory]);

  // Group filtered products by category and sort by name
  const productsByCategory = useMemo(() => {
    if (!filteredProducts || filteredProducts.length === 0) {
      return {};
    }
    const grouped = filteredProducts.reduce((acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = [];
      }
      acc[product.category].push(product);
      return acc;
    }, {} as Record<string, typeof filteredProducts>);

    // Sort products by name within each category
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      );
    });

    // Sort categories based on area
    const categoryOrder = Object.keys(grouped);
    if (selectedArea === 'Cocina') {
      categoryOrder.sort((a, b) => {
        // Cocina first
        if (a === 'Cocina' && b !== 'Cocina') return -1;
        if (a !== 'Cocina' && b === 'Cocina') return 1;
        // Limpieza second
        if (a === 'Limpieza' && b !== 'Cocina' && b !== 'Limpieza') return -1;
        if (a !== 'Cocina' && a !== 'Limpieza' && b === 'Limpieza') return 1;
        // Others alphabetically
        return a.localeCompare(b, 'es', { sensitivity: 'base' });
      });
    } else if (selectedArea === 'Cafetin') {
      categoryOrder.sort((a, b) => {
        const cafetin = (c: string) => c === 'Cafetin';
        if (cafetin(a) && !cafetin(b)) return -1;
        if (!cafetin(a) && cafetin(b)) return 1;
        if (a === 'Cocina' && b !== 'Cocina' && !cafetin(b)) return -1;
        if (a !== 'Cocina' && !cafetin(a) && b === 'Cocina') return 1;
        if (a === 'Limpieza' && b !== 'Limpieza' && !cafetin(b) && b !== 'Cocina') return -1;
        if (a !== 'Limpieza' && !cafetin(a) && a !== 'Cocina' && b === 'Limpieza') return 1;
        return a.localeCompare(b, 'es', { sensitivity: 'base' });
      });
    } else {
      // Default alphabetical order for other areas
      categoryOrder.sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' })
      );
    }

    // Rebuild grouped object in sorted order
    const sortedGrouped: Record<string, typeof filteredProducts> = {};
    categoryOrder.forEach(category => {
      sortedGrouped[category] = grouped[category];
    });

    // Initialize expanded state for new categories (default: expanded)
    setExpandedCategories(prev => {
      const updated = { ...prev };
      Object.keys(sortedGrouped).forEach(category => {
        if (!(category in updated)) {
          updated[category] = true;
        }
      });
      return updated;
    });

    return sortedGrouped;
  }, [filteredProducts, selectedArea]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Calculate selected products
  const selectedProducts = useMemo(() => {
    if (!areaProducts || areaProducts.length === 0) return [];
    return Object.entries(quantities)
      .filter(([_, cantidad]) => cantidad > 0)
      .map(([productId, cantidad]) => {
        const product = areaProducts.find(p => p._id === productId);
        return product ? { ...product, cantidad } : null;
      })
      .filter(Boolean) as Array<ConvexProduct & { cantidad: number }>;
  }, [quantities, areaProducts]);

  // Loading state - prevent flickering by showing loading UI when products is undefined
  // This check must be after all hooks to comply with Rules of Hooks
  if (products === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageContainer>
          <ProductListSkeleton count={8} />
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <PageContainer>
        <form id="pedido-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Search and Filter Section */}
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar producto
                </label>
                <div className="relative">
                  <input
                    id="search"
                    type="text"
                    placeholder="Buscar por nombre o subcategoría..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full h-10 px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
                      aria-label="Limpiar búsqueda"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-1">
                  Filtrar por subcategoría
                </label>
                <select
                  id="subcategory"
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="all">Todas las subcategorías</option>
                  {subcategories.map(subcat => (
                    <option key={subcat} value={subcat}>{subcat}</option>
                  ))}
                </select>
              </div>
            </div>
            {(searchQuery || selectedSubcategory !== 'all') && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSubcategory('all');
                  }}
                  className="text-sm text-emerald-600 hover:text-emerald-900"
                >
                  Limpiar filtros
                </button>
                <span className="text-sm text-gray-500">
                  ({filteredProducts.length} {filteredProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'})
                </span>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">Productos Disponibles</h2>

            {Object.keys(productsByCategory).length === 0 ? (
              searchQuery || selectedSubcategory !== 'all' ? (
                <EmptySearchResultsState
                  onClearFilters={() => {
                    setSearchQuery('');
                    setSelectedSubcategory('all');
                  }}
                />
              ) : (
                <EmptyState
                  title="No hay productos disponibles"
                  message="No hay productos disponibles en este momento."
                />
              )
            ) : (
              Object.entries(productsByCategory).map(([category, categoryProducts]) => {
                const isExpanded = expandedCategories[category] !== false; // Default to true
                return (
                  <div key={category} className="mb-6">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="flex items-center gap-2 text-lg font-medium text-gray-800 mb-3 hover:text-gray-900 transition-colors"
                    >
                      <svg
                        className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>{category}</span>
                    </button>
                    {isExpanded && (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="divide-y divide-gray-200">
                          {categoryProducts.map((product) => {
                            const hasStock = product.stockAlmacen > 0;
                            // Para Cafetin, nunca deshabilitar por falta de stock (se pide directo del proveedor)
                            // Para otras áreas, deshabilitar si no hay stock
                            const isDisabled = selectedArea !== 'Cafetin' && !hasStock;

                            // Para Cafetin: si tiene stock, límite en unidad de visualización (compra o base); si no, sin límite
                            // Para otras áreas: siempre límite en base unit
                            const isLeche = product.name.toLowerCase().includes('leche');
                            const usePurchaseUnit = selectedArea === 'Cafetin' && (product.category === 'Cafetin' || isLeche) && product.availableForSale !== false;
                            const maxQuantity = selectedArea === 'Cafetin'
                              ? (hasStock
                                ? (usePurchaseUnit
                                  ? Math.floor(product.stockAlmacen / product.conversionFactor)
                                  : product.stockAlmacen)
                                : undefined)
                              : product.stockAlmacen;

                            return (
                              <div
                                key={product._id}
                                className={`py-2 px-2 md:px-3 flex flex-row items-center justify-between gap-3 transition-colors border-b border-gray-100 last:border-0 ${isDisabled
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'hover:bg-gray-50'
                                  }`}
                              >
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="mb-0.5">
                                    <span className={`text-sm font-semibold block ${isDisabled ? 'text-gray-400' : 'text-gray-900'
                                      } ${selectedArea === 'Cafetin' ? 'line-clamp-2 leading-tight' : 'truncate'
                                      }`}>
                                      {product.name}
                                    </span>
                                  </div>
                                  <div>
                                    <span className={`text-xs truncate block ${isDisabled ? 'text-gray-300' : 'text-gray-500'
                                      }`}>
                                      {product.category}
                                      {product.subCategory && ` · ${product.subCategory}`}
                                    </span>
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  <QuantityInput
                                    itemId={product._id}
                                    value={quantities[product._id] || 0}
                                    onChange={(value) => handleQuantityChange(product._id, value)}
                                    min={0}
                                    max={maxQuantity}
                                    unit={getOrderUnit(product, selectedArea)}
                                    disabled={isDisabled}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </form>
      </PageContainer>

      {/* Fixed Bottom Bar with Dropdown and Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center gap-3">
            {/* Selected Products Dropdown - Left Side */}
            {selectedProducts.length > 0 && (
              <div className="relative flex-1" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setSummaryExpanded(!summaryExpanded)}
                  className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Seleccionados</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                      {selectedProducts.length}
                    </span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${summaryExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {summaryExpanded && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto z-10">
                    <div className="p-3 space-y-2">
                      {selectedProducts.map((product) => (
                        <div
                          key={product._id}
                          className="flex items-center justify-between bg-gray-50 rounded-md p-2 border border-gray-200"
                        >
                          <span className="text-sm font-medium text-gray-900 truncate flex-1 mr-2">
                            {product.name}
                          </span>
                          <span className="text-sm text-gray-600 whitespace-nowrap">
                            {product.cantidad} {pluralizeUnit(getOrderUnit(product, selectedArea), product.cantidad)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WhatsApp Button for Cafetin */}
            {selectedArea === 'Cafetin' && selectedProducts.length > 0 && (
              <div className="w-auto">
                <Button
                  type="button"
                  onClick={handleWhatsAppOrder}
                  className="w-full h-full py-3 min-w-[50px] bg-[#25D366] hover:bg-[#128C7E] text-white border-transparent focus:ring-[#128C7E]"
                  variant="primary" // Overridden by className
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                </Button>
              </div>
            )}

            {/* Submit Button - Right Side */}
            <div className={selectedProducts.length > 0 ? 'w-auto' : 'w-full'}>
              <Button
                type="submit"
                form="pedido-form"
                variant="primary"
                disabled={isSubmitting}
                className="w-full h-full py-3 min-w-[120px]"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </div>
  );
}

export default function CreateOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <PageContainer>
          <ProductListSkeleton count={8} />
        </PageContainer>
      </div>
    }>
      <CreateOrderPageContent />
    </Suspense>
  );
}
