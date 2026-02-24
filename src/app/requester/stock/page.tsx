'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { RequesterHeader } from '@/components/requester/RequesterHeader';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { ProductListSkeleton } from '@/components/ui/SkeletonLoader';
import { EmptyState, EmptySearchResultsState } from '@/components/ui/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CafetinProductModal } from '@/components/ui/CafetinProductModal';
import { CafetinProductForm } from '@/components/ui/CafetinProductForm';
import { normalizeSearchText } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useInventorySync } from '@/lib/hooks/useInventorySync';
import { useInventoryData } from '@/lib/hooks/useInventoryData';
import { useOfflineMutation } from '@/lib/hooks/useOfflineMutation';

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

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
}

function StockPageContent() {
  // Sincronizar datos de Convex al store de Zustand
  useInventorySync();

  // Obtener datos híbridos (Convex o cache)
  const products = useInventoryData();
  // Usar wrapper offline para updateStock
  const updateStock = useOfflineMutation('updateStock');
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('name-asc');
  const [editMode, setEditMode] = useState(false);
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<Id<"products"> | null>(null);
  const [adjustingId, setAdjustingId] = useState<Id<"products"> | null>(null);
  const [adjustValue, setAdjustValue] = useState<string>('0');
  const [editingProduct, setEditingProduct] = useState<ConvexProduct | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
  }>({
    message: '',
    type: 'info',
    isOpen: false,
  });

  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Read status query parameter on mount
  useEffect(() => {
    const statusParam = searchParams?.get('status');
    if (statusParam === 'bajo_stock') {
      setSelectedStatus('bajo_stock');
    }
  }, [searchParams]);

  // Get unique subcategories from cafetin products only (a la venta)
  const subCategories = useMemo(() => {
    if (!products || products.length === 0) return [];
    const filtered = products.filter(p => p.active && p.stockCafetin > 0 && p.availableForSale !== false);

    // Get unique subcategories from filtered products
    const subCats = Array.from(
      new Set(
        filtered
          .map(product => product.subCategory)
          .filter((subCat): subCat is string => !!subCat && subCat.trim() !== '')
      )
    ).sort();

    return ['All', ...subCats];
  }, [products]);

  // Filter and search products - only show cafetin products a la venta
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    // Only show active products with cafetin stock and available for sale (unless filtering for inactive)
    let filtered = products;

    if (selectedStatus === 'inactive') {
      // Show only inactive products (regardless of stock or availableForSale)
      filtered = filtered.filter(p => !p.active);
    } else {
      // Default behavior: Active + Available for Sale
      filtered = filtered.filter(p => p.active && p.availableForSale !== false);
      // Only show products belonging to the Cafetin category (even if stock is 0)
      filtered = filtered.filter(p => p.category.toLowerCase() === 'cafetin');
    }

    // Filter by subcategory
    if (selectedSubCategory !== 'All') {
      filtered = filtered.filter(product => product.subCategory === selectedSubCategory);
    }

    // Filter by search query (using debounced query)
    if (debouncedSearchQuery.trim()) {
      const query = normalizeSearchText(debouncedSearchQuery);
      filtered = filtered.filter(product =>
        normalizeSearchText(product.name).includes(query) ||
        normalizeSearchText(product.category).includes(query) ||
        (product.subCategory && normalizeSearchText(product.subCategory).includes(query)) ||
        (product.brand && normalizeSearchText(product.brand).includes(query))
      );
    }

    // Filter by status
    if (selectedStatus !== 'all' && selectedStatus !== 'inactive') {
      if (selectedStatus === 'bajo_stock') {
        filtered = filtered.filter(product => product.status === 'bajo_stock');
      } else if (selectedStatus === 'out_of_stock') {
        filtered = filtered.filter(product => product.stockCafetin === 0);
      }
    }

    // Sort products
    const sorted = [...filtered];

    switch (sortOrder) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name, 'es'));
        break;
      case 'stock-asc':
        // Primero mostrar items con bajo stock, luego los demás
        // Dentro de cada grupo, ordenar por stock (menor a mayor)
        sorted.sort((a, b) => {
          const aLowStock = a.status === 'bajo_stock' ? 0 : 1;
          const bLowStock = b.status === 'bajo_stock' ? 0 : 1;
          if (aLowStock !== bLowStock) {
            return aLowStock - bLowStock; // Bajo stock primero
          }
          return a.stockCafetin - b.stockCafetin; // Luego por stock menor a mayor
        });
        break;
      case 'stock-desc':
        sorted.sort((a, b) => b.stockCafetin - a.stockCafetin);
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }

    return sorted;
  }, [products, selectedSubCategory, selectedStatus, debouncedSearchQuery, sortOrder]);

  const handleAdjustClick = (product: ConvexProduct, delta?: number) => {
    if (adjustingId === product._id) {
      // Already adjusting this product, apply delta
      if (delta !== undefined) {
        const currentValue = parseInt(adjustValue, 10) || 0;
        const newValue = currentValue + delta;
        if (newValue < 0) return;
        setAdjustValue(newValue.toString());
      }
    } else {
      // Start adjusting this product
      setAdjustingId(product._id);
      // Always use cafetin location
      const currentStock = product.stockCafetin;
      if (delta !== undefined) {
        setAdjustValue(delta > 0 ? '1' : '0');
      } else {
        // Initialize with empty string so user can input new value directly
        setAdjustValue('');
      }
    }
  };

  const handleQuickAdjust = async (productId: Id<"products">, delta: number) => {
    if (!products) return;
    const product = products.find(p => p._id === productId);
    if (!product) return;

    // Always use cafetin location
    const currentStock = product.stockCafetin;
    const newStock = currentStock + delta;
    if (newStock < 0) return;

    try {
      const result = await updateStock({
        productId,
        location: 'cafetin',
        newStock,
        user: "requester"
      });

      // Si la acción fue encolada (offline), mostrar mensaje diferente
      if (result && 'queued' in result && result.queued) {
        // No mostrar toast para acciones encoladas porque ya hay un indicador visual
      } else {
        setToast({
          message: 'Stock actualizado correctamente',
          type: 'success',
          isOpen: true,
        });
      }
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      setToast({
        message: 'Error al actualizar stock. Intente de nuevo.',
        type: 'error',
        isOpen: true,
      });
    }
  };

  const handleSaveAdjustment = async (productId: Id<"products">) => {
    if (!products) return;
    const numValue = parseInt(adjustValue, 10);
    const product = products.find(p => p._id === productId);

    if (!product || isNaN(numValue)) return;

    // Always use cafetin location
    const newStock = numValue;
    if (newStock < 0) return;

    try {
      const result = await updateStock({
        productId,
        location: 'cafetin',
        newStock,
        user: "requester"
      });

      setAdjustingId(null);
      setAdjustValue('');

      // Si la acción fue encolada (offline), mostrar mensaje diferente
      if (result && 'queued' in result && result.queued) {
        // No mostrar toast para acciones encoladas porque ya hay un indicador visual
      } else {
        setToast({
          message: 'Stock actualizado correctamente',
          type: 'success',
          isOpen: true,
        });
      }
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      setToast({
        message: 'Error al actualizar stock. Intente de nuevo.',
        type: 'error',
        isOpen: true,
      });
    }
  };

  const handleCancelAdjustment = () => {
    setAdjustingId(null);
    setAdjustValue('');
  };

  const handleDirectEdit = (product: ConvexProduct) => {
    setEditingProduct(product);
    // Always use cafetin location
    const currentStock = product.stockCafetin;
    setEditValue('');
  };

  const handleSaveDirectEdit = async () => {
    if (!editingProduct) return;

    const numValue = parseInt(editValue, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      // Always use cafetin location
      try {
        const result = await updateStock({
          productId: editingProduct._id,
          location: 'cafetin',
          newStock: numValue,
          user: "requester"
        });
        setEditingProduct(null);
        setEditValue('');

        // Si la acción fue encolada (offline), mostrar mensaje diferente
        if (result && 'queued' in result && result.queued) {
          // No mostrar toast para acciones encoladas
        } else {
          setToast({
            message: 'Stock actualizado correctamente',
            type: 'success',
            isOpen: true,
          });
        }
      } catch (error) {
        console.error('Error al actualizar stock:', error);
        setToast({
          message: 'Error al actualizar stock. Intente de nuevo.',
          type: 'error',
          isOpen: true,
        });
      }
    }
  };

  const handleCancelDirectEdit = () => {
    setEditingProduct(null);
    setEditValue('');
  };

  const isLowStock = (product: ConvexProduct) => {
    return product.status === 'bajo_stock';
  };

  const formatUnitDisplay = (product: ConvexProduct) => {
    return product.baseUnit;
  };

  // Loading state
  if (products === undefined) {
    return (
      <PageContainer>
        <RequesterHeader
          title="Stock"
          subtitle="Inventario del Cafetin"
        />
        <ProductListSkeleton count={8} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="!overflow-visible">
      <RequesterHeader
        title="Stock"
        subtitle="Inventario del Cafetin"
      />

      {/* Sticky Header Container */}
      <div className="sticky top-0 z-20 bg-gray-50 pt-4 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 mb-6 shadow-sm border-b border-gray-100">
        {/* Search Bar */}
        <div className="mb-4 w-full">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full h-10 pl-10 pr-10 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none focus:text-gray-700 focus:bg-gray-100 transition-colors z-10 cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Selectors */}
        <div className="mb-6 w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Subcategory Filter Button */}
            <div className="flex items-center gap-2">
              <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
                <SelectTrigger className="w-auto min-w-[180px]" disabled={subCategories.length <= 1}>
                  <SelectValue placeholder="Subcategorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Subcategorías</SelectItem>
                  {subCategories.filter(subCat => subCat !== 'All').map(subCategory => (
                    <SelectItem key={subCategory} value={subCategory}>{subCategory}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Edit Toggle Button */}
              <button
                type="button"
                onClick={() => setEditMode(!editMode)}
                title={editMode ? "Salir de Modo Edición" : "Entrar en Modo Edición"}
                className={`p-2 rounded-md transition-colors border ${editMode
                  ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {editMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                )}
              </button>

              {/* Crear Producto (Visible only in edit mode) */}
              {editMode && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setIsCreateProductOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 h-auto"
                  title="Crear Nuevo Producto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </Button>
              )}
            </div>

            {/* Status and Sort Group - Mobile optimized */}
            <div className="flex flex-row items-center gap-2">
              {/* Status Segmented Control */}
              <div className="flex items-center gap-0 bg-white border border-gray-300 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${selectedStatus === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('bajo_stock')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${selectedStatus === 'bajo_stock'
                    ? 'bg-gray-900 text-white'
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  Bajo Stock
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('out_of_stock')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${selectedStatus === 'out_of_stock'
                    ? 'bg-gray-900 text-white'
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  Sin Stock
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('inactive')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${selectedStatus === 'inactive'
                    ? 'bg-gray-900 text-white'
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  Inactivos
                </button>
              </div>

              {/* Sort Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                  className={`p-2 rounded-md border transition-colors ${isSortMenuOpen || sortOrder !== 'name-asc'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  title="Ordenar productos"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                </button>

                {/* Sort Dropdown */}
                {isSortMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsSortMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-40">
                      <button
                        onClick={() => {
                          setSortOrder('name-asc');
                          setIsSortMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${sortOrder === 'name-asc' ? 'text-emerald-600 font-medium' : 'text-gray-700'
                          }`}
                      >
                        Nombre (A-Z)
                        {sortOrder === 'name-asc' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setSortOrder('name-desc');
                          setIsSortMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${sortOrder === 'name-desc' ? 'text-emerald-600 font-medium' : 'text-gray-700'
                          }`}
                      >
                        Nombre (Z-A)
                        {sortOrder === 'name-desc' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setSortOrder('stock-asc');
                          setIsSortMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${sortOrder === 'stock-asc' ? 'text-emerald-600 font-medium' : 'text-gray-700'
                          }`}
                      >
                        Stock (Menor a Mayor)
                        {sortOrder === 'stock-asc' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setSortOrder('stock-desc');
                          setIsSortMenuOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${sortOrder === 'stock-desc' ? 'text-emerald-600 font-medium' : 'text-gray-700'
                          }`}
                      >
                        Stock (Mayor a Menor)
                        {sortOrder === 'stock-desc' && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(debouncedSearchQuery || selectedSubCategory !== 'All' || selectedStatus !== 'all' || sortOrder !== 'name-asc') && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSubCategory('All');
                  setSelectedStatus('all');
                  setSortOrder('name-asc');
                }}
                className="text-sm text-emerald-600 hover:text-emerald-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-md px-2 py-1"
              >
                Limpiar filtros
              </button>
              <span className="text-sm text-gray-500">
                ({filteredProducts.length} {filteredProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        {/* Product List Column */}
        <div className={`w-full transition-all duration-300 ${isDesktop && (editingProductId || isCreateProductOpen) ? 'lg:col-span-4' : 'lg:col-span-12'}`}>
          <div className={`grid gap-4 w-full ${isDesktop && (editingProductId || isCreateProductOpen)
            ? 'grid-cols-1'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {filteredProducts.length === 0 ? (
              debouncedSearchQuery || selectedSubCategory !== 'All' || selectedStatus !== 'all' ? (
                <div className="col-span-full">
                  <EmptySearchResultsState
                    onClearFilters={() => {
                      setSearchQuery('');
                      setSelectedSubCategory('All');
                      setSelectedStatus('all');
                      setSortOrder('name-asc');
                    }}
                  />
                </div>
              ) : (
                <div className="col-span-full">
                  <EmptyState
                    title="No hay productos"
                    message="No se encontraron productos en el inventario del cafetin."
                  />
                </div>
              )
            ) : (
              filteredProducts.map((product) => {
                const lowStock = isLowStock(product);
                const isAdjusting = adjustingId === product._id;

                return (
                  <div
                    key={product._id}
                    onClick={() => {
                      if (editMode) {
                        setEditingProductId(product._id);
                      }
                    }}
                    className={`bg-white rounded-md shadow-sm border overflow-hidden w-full h-full flex flex-col transition-all ${lowStock ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-emerald-500'
                      } ${editMode
                        ? 'cursor-pointer hover:border-emerald-500 hover:shadow-md border-gray-200'
                        : 'border-gray-200'
                      }`}
                  >
                    <div className="p-2 sm:p-3 w-full flex-1 flex flex-col">
                      <div className="flex flex-col gap-2 w-full flex-1">
                        {/* Product Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm sm:text-base font-semibold text-emerald-600 mb-0.5 overflow-wrap-anywhere ${editMode ? 'hover:text-emerald-800' : ''
                              }`}>
                              {product.name}
                              {editMode && (
                                <span className="ml-2 text-xs text-gray-400">
                                  (Click para editar)
                                </span>
                              )}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 overflow-wrap-anywhere">
                                {product.subCategory || product.category}
                              </span>
                              {product.brand && product.brand !== 'Genérica' && product.brand !== '' && (
                                <span className="text-xs text-gray-500 overflow-wrap-anywhere">
                                  {product.brand}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Status Badge */}
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`h-2 w-2 rounded-full ${lowStock ? 'bg-red-500' : 'bg-emerald-500'
                              }`}></span>
                            <Badge variant={lowStock ? 'bajo-minimo' : 'ok'}>
                              {lowStock ? 'Bajo Stock' : 'OK'}
                            </Badge>
                          </div>
                        </div>

                        {/* Stock Display with Controls */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs uppercase text-gray-500 font-medium whitespace-nowrap">
                            STOCK
                          </span>
                          <span className={`text-lg sm:text-xl font-bold whitespace-nowrap ${lowStock ? 'text-red-600' : 'text-gray-900'
                            }`}>
                            {product.stockCafetin}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                            {product.baseUnit}
                          </span>

                          {/* Adjustment Controls */}
                          {isAdjusting && adjustingId === product._id ? (
                            <>
                              <div className="flex items-center gap-2 ml-auto">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleAdjustClick(product, -1); }}
                                  className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                  aria-label="Decrementar"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  value={adjustValue}
                                  onChange={(e) => setAdjustValue(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-16 h-9 px-2 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                  autoFocus
                                />
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleAdjustClick(product, 1); }}
                                  className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                  aria-label="Incrementar"
                                >
                                  +
                                </button>
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSaveAdjustment(product._id); }}
                                  className="px-3 py-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-800 h-9 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-md"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCancelAdjustment(); }}
                                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 h-9 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-md"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-1 sm:gap-2 ml-auto">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleQuickAdjust(product._id, -1); }}
                                className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                title="Reducir stock en 1"
                                aria-label="Reducir stock en 1"
                              >
                                −
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAdjustClick(product); }}
                                className="px-2 sm:px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md bg-white whitespace-nowrap h-9 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                title="Ajustar cantidad"
                              >
                                Ajustar
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleQuickAdjust(product._id, 1); }}
                                className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                title="Aumentar stock en 1"
                                aria-label="Aumentar stock en 1"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Desktop Side Panel */}
        {isDesktop && (editingProductId || isCreateProductOpen) && (
          <div className="hidden lg:block lg:col-span-8 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              {(editingProductId || isCreateProductOpen) ? (
                <CafetinProductForm
                  productId={isCreateProductOpen ? null : editingProductId}
                  onSuccess={() => {
                    setToast({
                      message: isCreateProductOpen ? 'Producto creado correctamente' : 'Producto actualizado correctamente',
                      type: 'success',
                      isOpen: true,
                    });
                    if (isCreateProductOpen) {
                      setIsCreateProductOpen(false);
                    }
                  }}
                  onCancel={() => {
                    setEditingProductId(null);
                    setIsCreateProductOpen(false);
                  }}
                  onProductDeleted={() => {
                    setEditingProductId(null);
                    setToast({
                      message: 'Producto eliminado correctamente',
                      type: 'success',
                      isOpen: true,
                    });
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-gray-500">
                  <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-lg font-medium">Selecciona un producto</p>
                  <p className="text-sm">Haz clic en un producto para ver o editar sus detalles.</p>
                  {editMode && (
                    <Button variant="secondary" className="mt-4" onClick={() => setIsCreateProductOpen(true)}>
                      Crear Nuevo Producto
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Stock Modal */}
      {
        editingProduct && (
          <Modal
            isOpen={editingProduct !== null}
            onClose={handleCancelDirectEdit}
            title={`Editar stock de ${editingProduct.name}`}
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="stock-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Stock actual (Cafetin)
                </label>
                <input
                  id="stock-input"
                  type="number"
                  min="0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveDirectEdit();
                    }
                  }}
                />
                <p className="mt-2 text-sm text-gray-500">
                  Unidad: {editingProduct.baseUnit}
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelDirectEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <Button
                  onClick={handleSaveDirectEdit}
                  variant="primary"
                  className="px-4 py-2 text-sm h-auto"
                >
                  Guardar
                </Button>
              </div>
            </div>
          </Modal>
        )
      }

      {/* Edit Product Modal */}
      <CafetinProductModal
        key={editingProductId ?? (isCreateProductOpen ? 'create' : 'closed')}
        isOpen={!isDesktop && (editingProductId !== null || isCreateProductOpen)}
        onClose={() => {
          setEditingProductId(null);
          setIsCreateProductOpen(false);
        }}
        productId={isCreateProductOpen ? null : editingProductId}
        onProductCreated={() => {
          setToast({
            message: 'Producto creado correctamente',
            type: 'success',
            isOpen: true,
          });
        }}
        onProductUpdated={() => {
          setToast({
            message: 'Producto actualizado correctamente',
            type: 'success',
            isOpen: true,
          });
        }}
        onProductDeleted={() => {
          setToast({
            message: 'Producto eliminado correctamente',
            type: 'success',
            isOpen: true,
          });
          setEditingProductId(null);
        }}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />
    </PageContainer >
  );
}

export default function StockPage() {
  return (
    <Suspense fallback={
      <PageContainer>
        <RequesterHeader
          title="Stock"
          subtitle="Inventario del Cafetin"
        />
        <ProductListSkeleton count={8} />
      </PageContainer>
    }>
      <StockPageContent />
    </Suspense>
  );
}
