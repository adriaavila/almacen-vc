'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { ProductListSkeleton } from '@/components/ui/SkeletonLoader';
import { EmptyState, EmptySearchResultsState } from '@/components/ui/EmptyState';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EditProductModal } from '@/components/ui/EditProductModal';
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

export default function InventoryPage() {
  // Sincronizar datos de Convex al store de Zustand
  useInventorySync();

  // Obtener datos híbridos (Convex o cache)
  const products = useInventoryData();
  // Usar wrapper offline para updateStock
  const updateStock = useOfflineMutation('updateStock');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
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

  // Read status query parameter on mount
  useEffect(() => {
    const statusParam = searchParams?.get('status');
    if (statusParam === 'bajo_stock') {
      setSelectedStatus('bajo_stock');
    }
  }, [searchParams]);

  // Get unique categories from almacen products only
  const categories = useMemo(() => {
    if (!products || products.length === 0) return [];
    // Filter only almacen products (exclude Cafetin)
    const almacenProducts = products.filter(p =>
      p.active &&
      p.category !== 'Cafetin'
    );

    // Get unique categories from filtered products
    const cats = Array.from(
      new Set(
        almacenProducts
          .map(product => product.category)
          .filter((cat): cat is string => !!cat && cat.trim() !== '')
      )
    ).sort();

    return ['All', ...cats];
  }, [products]);

  // Filter and search products
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    // Only show active almacen products (exclude Cafetin)
    let filtered = products.filter(p =>
      p.active &&
      p.category !== 'Cafetin'
    );

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
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
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'bajo_stock') {
        filtered = filtered.filter(product => product.status === 'bajo_stock');
      } else if (selectedStatus === 'out_of_stock') {
        filtered = filtered.filter(product => product.stockAlmacen === 0);
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
          return a.stockAlmacen - b.stockAlmacen; // Luego por stock menor a mayor
        });
        break;
      case 'stock-desc':
        sorted.sort((a, b) => b.stockAlmacen - a.stockAlmacen);
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }

    return sorted;
  }, [products, selectedCategory, selectedStatus, debouncedSearchQuery, sortOrder]);

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
      // Always use almacen location
      const currentStock = product.stockAlmacen;
      if (delta !== undefined) {
        setAdjustValue(delta > 0 ? '1' : '0');
      } else {
        // Initialize with current stock so user can modify it directly
        setAdjustValue(currentStock.toString());
      }
    }
  };

  const handleQuickAdjust = async (productId: Id<"products">, delta: number) => {
    if (!products) return;
    const product = products.find(p => p._id === productId);
    if (!product) return;

    // Always use almacen location
    const currentStock = product.stockAlmacen;
    const newStock = currentStock + delta;
    if (newStock < 0) return;

    try {
      const result = await updateStock({
        productId,
        location: 'almacen',
        newStock,
        user: "admin"
      });

      // Si la acción fue encolada (offline), mostrar mensaje diferente
      if (result && 'queued' in result && result.queued) {
        setToast({
          message: 'Stock actualizado (se sincronizará cuando vuelva la conexión)',
          type: 'info',
          isOpen: true,
        });
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

    // Always use almacen location
    const newStock = numValue;
    if (newStock < 0) return;

    try {
      const result = await updateStock({
        productId,
        location: 'almacen',
        newStock,
        user: "admin"
      });

      setAdjustingId(null);
      setAdjustValue('0');

      // Si la acción fue encolada (offline), mostrar mensaje diferente
      if (result && 'queued' in result && result.queued) {
        setToast({
          message: 'Stock actualizado (se sincronizará cuando vuelva la conexión)',
          type: 'info',
          isOpen: true,
        });
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
    setAdjustValue('0');
  };

  const handleDirectEdit = (product: ConvexProduct) => {
    setEditingProduct(product);
    // Always use almacen location
    const currentStock = product.stockAlmacen;
    setEditValue(currentStock.toString());
  };

  const handleSaveDirectEdit = async () => {
    if (!editingProduct) return;

    const numValue = parseInt(editValue, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      // Always use almacen location
      try {
        const result = await updateStock({
          productId: editingProduct._id,
          location: 'almacen',
          newStock: numValue,
          user: "admin"
        });
        setEditingProduct(null);
        setEditValue('');

        // Si la acción fue encolada (offline), mostrar mensaje diferente
        if (result && 'queued' in result && result.queued) {
          setToast({
            message: 'Stock actualizado (se sincronizará cuando vuelva la conexión)',
            type: 'info',
            isOpen: true,
          });
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
        <AdminHeader
          title="Inventario"
          subtitle="Gestión de productos y stock"
        />
        <ProductListSkeleton count={8} />
      </PageContainer>
    );
  }

  return (
    <>
      <PageContainer className="!overflow-visible">
        <AdminHeader
          title="Inventario"
          subtitle="Gestión de productos y stock"
        />
        <div className="sticky top-0 z-20 bg-white pt-4 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-gray-100 shadow-sm transition-all duration-200">
          {/* Search Bar */}
          <div className="mb-2 w-full">
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
          <div className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Category Filter Button with Edit Button */}
              <div className="flex items-center gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-auto min-w-[180px]" disabled={categories.length <= 1}>
                    <SelectValue placeholder="Categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Categorías</SelectItem>
                    {categories.filter(cat => cat !== 'All').map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
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

              {/* Status Segmented Control */}
              <div className="flex items-center gap-0 bg-white border border-gray-300 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedStatus === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('bajo_stock')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedStatus === 'bajo_stock'
                    ? 'bg-gray-900 text-white'
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  Bajo Stock
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('out_of_stock')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedStatus === 'out_of_stock'
                    ? 'bg-gray-900 text-white'
                    : 'bg-transparent text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  Sin Stock
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

            {/* Clear Filters Button */}
            {(debouncedSearchQuery || selectedCategory !== 'All' || selectedStatus !== 'all' || sortOrder !== 'name-asc') && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
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

        {/* Inventory List */}
        <div className="space-y-3 w-full">
          {filteredProducts.length === 0 ? (
            debouncedSearchQuery || selectedCategory !== 'All' || selectedStatus !== 'all' ? (
              <EmptySearchResultsState
                onClearFilters={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedStatus('all');
                  setSortOrder('name-asc');
                }}
              />
            ) : (
              <EmptyState
                title="No hay productos"
                message="No se encontraron productos en el inventario."
              />
            )
          ) : (
            filteredProducts.map((product) => {
              const lowStock = isLowStock(product);
              const isAdjusting = adjustingId === product._id;

              return (
                <div
                  key={product._id}
                  className={`bg-white rounded-md shadow-sm border overflow-hidden w-full ${editMode
                    ? `cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all ${lowStock ? 'border-l-4 border-l-red-500 border-r-2 border-t-2 border-b-2' : 'border-l-4 border-l-emerald-500 border-r-2 border-t-2 border-b-2'}`
                    : `${lowStock ? 'border-l-4 border-l-red-500 border-gray-200' : 'border-l-4 border-l-emerald-500 border-gray-200'}`
                    }`}
                  onClick={editMode ? () => setEditingProductId(product._id) : undefined}
                >
                  <div className="p-2 sm:p-3 w-full">
                    <div className="flex flex-col gap-2 w-full">
                      {/* Product Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {editMode ? (
                            <h3 className="text-sm sm:text-base font-semibold text-emerald-600 hover:text-emerald-800 mb-0.5 cursor-pointer overflow-wrap-anywhere">
                              {product.name}
                              <span className="ml-2 text-xs text-gray-400">(Click para editar)</span>
                            </h3>
                          ) : (
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-0.5 overflow-wrap-anywhere">
                              {product.name}
                            </h3>
                          )}
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
                          {product.stockAlmacen}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                          {product.baseUnit}
                        </span>

                        {/* Adjustment Controls */}
                        {isAdjusting && adjustingId === product._id ? (
                          <>
                            <div className="flex items-center gap-2 ml-auto">
                              <button
                                onClick={() => handleAdjustClick(product, -1)}
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
                                className="w-16 h-9 px-2 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => handleAdjustClick(product, 1)}
                                className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                aria-label="Incrementar"
                              >
                                +
                              </button>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => handleSaveAdjustment(product._id)}
                                className="px-3 py-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-800 h-9 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-md"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={handleCancelAdjustment}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 h-9 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-md"
                              >
                                Cancelar
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1 sm:gap-2 ml-auto">
                            <button
                              onClick={() => handleQuickAdjust(product._id, -1)}
                              className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                              title="Reducir stock en 1"
                              aria-label="Reducir stock en 1"
                            >
                              −
                            </button>
                            <button
                              onClick={() => handleAdjustClick(product)}
                              className="px-2 sm:px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md bg-white whitespace-nowrap h-9 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                              title="Ajustar cantidad"
                            >
                              Ajustar
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(product._id, 1)}
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
      </PageContainer>

      {/* Edit Stock Modal */}
      {editingProduct && (
        <Modal
          isOpen={editingProduct !== null}
          onClose={handleCancelDirectEdit}
          title={`Editar stock de ${editingProduct.name}`}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="stock-input" className="block text-sm font-medium text-gray-700 mb-2">
                Stock actual (Almacén)
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
      )}

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Edit Product Modal */}
      <EditProductModal
        key={editingProductId ?? (isCreateProductOpen ? 'create' : 'closed')}
        isOpen={editingProductId !== null || isCreateProductOpen}
        onClose={() => {
          setEditingProductId(null);
          setIsCreateProductOpen(false);
        }}
        productId={isCreateProductOpen ? null : editingProductId}
        onProductUpdated={() => {
          // Refresh will happen automatically via useInventorySync
          setToast({
            message: isCreateProductOpen ? 'Producto creado correctamente' : 'Producto actualizado correctamente',
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
    </>
  );
}
