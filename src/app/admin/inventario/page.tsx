'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
import { normalizeSearchText } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/useDebounce';

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
  totalStock: number;
  stockAlmacen: number;
  stockCafetin: number;
  status: "ok" | "bajo_stock";
};

export default function InventoryPage() {
  const products = useQuery(api.products.listWithInventory);
  const updateStock = useMutation(api.inventory.updateStock);
  const searchParams = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('name-asc');
  const [adjustingId, setAdjustingId] = useState<Id<"products"> | null>(null);
  const [adjustValue, setAdjustValue] = useState<string>('0');
  const [editingProduct, setEditingProduct] = useState<ConvexProduct | null>(null);
  const [editValue, setEditValue] = useState<string>('');
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

  // Get unique categories from all active products
  const categories = useMemo(() => {
    if (!products || products.length === 0) return [];
    const filtered = products.filter(p => p.active);
    
    // Get unique categories from filtered products
    const cats = Array.from(
      new Set(
        filtered
          .map(product => product.category)
          .filter((cat): cat is string => !!cat && cat.trim() !== '')
      )
    ).sort();
    
    return ['All', ...cats];
  }, [products]);
  
  // Filter and search products
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    // Only show active products
    let filtered = products.filter(p => p.active);
    
    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Filter by location
    if (selectedLocation !== 'all') {
      if (selectedLocation === 'almacen') {
        filtered = filtered.filter(product => product.stockAlmacen > 0);
      } else if (selectedLocation === 'cafetin') {
        filtered = filtered.filter(product => product.stockCafetin > 0);
      }
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
      filtered = filtered.filter(product => product.status === selectedStatus);
    }
    
    // Sort products
    const sorted = [...filtered];
    
    // Get stock value based on selected location
    const getStockValue = (product: ConvexProduct) => {
      if (selectedLocation === 'almacen') return product.stockAlmacen;
      if (selectedLocation === 'cafetin') return product.stockCafetin;
      return product.stockAlmacen; // Default to almacen for 'all'
    };
    
    switch (sortOrder) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name, 'es'));
        break;
      case 'stock-asc':
        sorted.sort((a, b) => getStockValue(a) - getStockValue(b));
        break;
      case 'stock-desc':
        sorted.sort((a, b) => getStockValue(b) - getStockValue(a));
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }
    
    return sorted;
  }, [products, selectedCategory, selectedLocation, selectedStatus, debouncedSearchQuery, sortOrder]);
  
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
      if (delta !== undefined) {
        setAdjustValue(delta > 0 ? '1' : '0');
      } else {
        setAdjustValue('0');
      }
    }
  };
  
  const handleQuickAdjust = async (productId: Id<"products">, delta: number) => {
    if (!products) return;
    const product = products.find(p => p._id === productId);
    if (!product) return;
    
    // Use selected location, default to almacen if "all" is selected
    const location = selectedLocation === 'all' ? 'almacen' : selectedLocation as 'almacen' | 'cafetin';
    const currentStock = location === 'almacen' ? product.stockAlmacen : product.stockCafetin;
    const newStock = currentStock + delta;
    if (newStock < 0) return;
    
    try {
      await updateStock({ 
        productId, 
        location,
        newStock,
        user: "admin"
      });
      setToast({
        message: 'Stock actualizado correctamente',
        type: 'success',
        isOpen: true,
      });
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
    
    // Use selected location, default to almacen if "all" is selected
    const location = selectedLocation === 'all' ? 'almacen' : selectedLocation as 'almacen' | 'cafetin';
    const currentStock = location === 'almacen' ? product.stockAlmacen : product.stockCafetin;
    const newStock = currentStock + numValue;
    if (newStock < 0) return;
    
    try {
      await updateStock({ 
        productId, 
        location,
        newStock,
        user: "admin"
      });
      setAdjustingId(null);
      setAdjustValue('0');
      setToast({
        message: 'Stock actualizado correctamente',
        type: 'success',
        isOpen: true,
      });
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
    // Use selected location, default to almacen if "all" is selected
    const location = selectedLocation === 'all' ? 'almacen' : selectedLocation as 'almacen' | 'cafetin';
    const currentStock = location === 'almacen' ? product.stockAlmacen : product.stockCafetin;
    setEditValue(currentStock.toString());
  };

  const handleSaveDirectEdit = async () => {
    if (!editingProduct) return;
    
    const numValue = parseInt(editValue, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      // Use selected location, default to almacen if "all" is selected
      const location = selectedLocation === 'all' ? 'almacen' : selectedLocation as 'almacen' | 'cafetin';
      try {
        await updateStock({ 
          productId: editingProduct._id, 
          location,
          newStock: numValue,
          user: "admin"
        });
        setEditingProduct(null);
        setEditValue('');
        setToast({
          message: 'Stock actualizado correctamente',
          type: 'success',
          isOpen: true,
        });
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
      <PageContainer>
        <AdminHeader 
          title="Inventario"
          subtitle="Gestión de productos y stock"
        />
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
              className="block w-full h-10 pl-10 pr-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm sm:text-base"
            />
          </div>
        </div>
        
        {/* Selectors */}
        <div className="mb-6 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Category Selector */}
            <div>
              <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">
                Filtrar por categoría
              </label>
              <select
                id="category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={categories.length <= 1}
                className="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                <option value="All">Todas las categorías</option>
                {categories.filter(cat => cat !== 'All').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            {/* Location Selector */}
            <div>
              <label htmlFor="location-select" className="block text-sm font-medium text-gray-700 mb-1">
                Ubicación
              </label>
              <select
                id="location-select"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
              >
                <option value="all">Todas las ubicaciones</option>
                <option value="almacen">Almacén</option>
                <option value="cafetin">Cafetín</option>
              </select>
            </div>
            
            {/* Sort Order Selector */}
            <div>
              <label htmlFor="sort-select" className="block text-sm font-medium text-gray-700 mb-1">
                Ordenar por
              </label>
              <select
                id="sort-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
              >
                <option value="name-asc">Orden alfabético (A-Z)</option>
                <option value="name-desc">Orden alfabético (Z-A)</option>
                <option value="stock-asc">Stock (menor a mayor)</option>
                <option value="stock-desc">Stock (mayor a menor)</option>
              </select>
            </div>
          </div>
          
          {/* Clear Filters Button */}
          {(debouncedSearchQuery || selectedCategory !== 'All' || selectedLocation !== 'all' || selectedStatus !== 'all' || sortOrder !== 'name-asc') && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedLocation('all');
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
        
        {/* Inventory List */}
        <div className="space-y-3 w-full">
          {filteredProducts.length === 0 ? (
            debouncedSearchQuery || selectedCategory !== 'All' || selectedLocation !== 'all' || selectedStatus !== 'all' ? (
              <EmptySearchResultsState
                onClearFilters={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedLocation('all');
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
                  className={`bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden w-full ${
                    lowStock ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-emerald-500'
                  }`}
                >
                  <div className="p-3 sm:p-4 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 w-full">
                      {/* Left Side - Product Info */}
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        <Link href={`/admin/inventario/${product._id}`}>
                          <h3 className="text-base sm:text-lg font-semibold text-emerald-600 hover:text-emerald-800 mb-1 cursor-pointer overflow-wrap-anywhere">
                            {product.name}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 overflow-wrap-anywhere">
                            {product.subCategory || product.category}
                          </span>
                          {product.brand && product.brand !== 'Genérica' && product.brand !== '' && (
                            <span className="text-xs text-gray-500 overflow-wrap-anywhere">
                              {product.brand}
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 overflow-wrap-anywhere">
                          {formatUnitDisplay(product)}
                        </div>
                        
                        {/* Stock Display */}
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-xs uppercase text-gray-500 font-medium whitespace-nowrap">
                            {selectedLocation === 'all' 
                              ? 'Stock'
                              : selectedLocation === 'almacen'
                              ? 'Stock Almacén'
                              : 'Stock Cafetín'}
                          </span>
                          {selectedLocation === 'all' ? (
                            <>
                              <span className={`text-xl sm:text-2xl font-bold whitespace-nowrap ${
                                lowStock ? 'text-red-600' : 'text-gray-900'
                              }`}>
                                {product.stockAlmacen}
                              </span>
                              <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                                (Alm)
                              </span>
                              {/* Solo mostrar stock cafetín si el producto pertenece al cafetín */}
                              {product.category === 'Cafetin' && (
                                <>
                                  <span className="text-gray-400 mx-1">/</span>
                                  <span className={`text-xl sm:text-2xl font-bold whitespace-nowrap ${
                                    product.stockCafetin === 0 ? 'text-gray-400' : 'text-gray-900'
                                  }`}>
                                    {product.stockCafetin}
                                  </span>
                                  <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                                    (Caf) {product.baseUnit}
                                  </span>
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <span className={`text-xl sm:text-2xl font-bold whitespace-nowrap ${
                                lowStock ? 'text-red-600' : 'text-gray-900'
                              }`}>
                                {selectedLocation === 'almacen' ? product.stockAlmacen : product.stockCafetin}
                              </span>
                              <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                                {product.baseUnit}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Right Side - Controls */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-3 shrink-0">
                        {/* Status Badge */}
                        <div className="flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full ${
                            lowStock ? 'bg-red-500' : 'bg-emerald-500'
                          }`}></span>
                          <Badge variant={lowStock ? 'bajo-minimo' : 'ok'}>
                            {lowStock ? 'Bajo Stock' : 'OK'}
                          </Badge>
                        </div>
                        
                        {/* Adjustment Controls */}
                        {isAdjusting && adjustingId === product._id ? (
                          <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                              <button
                                onClick={() => handleAdjustClick(product, -1)}
                                className="min-w-[44px] min-h-[44px] w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                aria-label="Decrementar"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={adjustValue}
                                onChange={(e) => setAdjustValue(e.target.value)}
                                className="w-16 min-h-[44px] px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => handleAdjustClick(product, 1)}
                                className="min-w-[44px] min-h-[44px] w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                aria-label="Incrementar"
                              >
                                +
                              </button>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto justify-end">
                              <button
                                onClick={() => handleSaveAdjustment(product._id)}
                                className="px-3 py-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-800 min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-md"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={handleCancelAdjustment}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-md"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">
                            <button
                              onClick={() => handleQuickAdjust(product._id, -1)}
                              className="min-w-[44px] min-h-[44px] w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium text-sm sm:text-base transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                              title="Reducir stock en 1"
                              aria-label="Reducir stock en 1"
                            >
                              −
                            </button>
                            <button
                              onClick={() => handleAdjustClick(product)}
                              className="px-2 sm:px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md bg-white whitespace-nowrap min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                              title="Ajustar cantidad"
                            >
                              Ajustar
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(product._id, 1)}
                              className="min-w-[44px] min-h-[44px] w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium text-sm sm:text-base transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
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
                Stock actual ({selectedLocation === 'all' ? 'Almacén' : selectedLocation === 'almacen' ? 'Almacén' : 'Cafetín'})
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
