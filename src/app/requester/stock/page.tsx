'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { RequesterHeader } from '@/components/requester/RequesterHeader';
import { Badge } from '@/components/ui/Badge';
import { normalizeSearchText } from '@/lib/utils';

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

export default function StockPage() {
  const products = useQuery(api.products.listWithInventory);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<string>('name-asc');

  // Get unique subcategories from cafetin products only
  const subCategories = useMemo(() => {
    if (!products || products.length === 0) return [];
    const filtered = products.filter(p => p.active && p.stockCafetin > 0);
    
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
  
  // Filter and search products - only show cafetin location products
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    // Only show active products with cafetin stock
    let filtered = products.filter(p => p.active && p.stockCafetin > 0);
    
    // Filter by subcategory
    if (selectedSubCategory !== 'All') {
      filtered = filtered.filter(product => product.subCategory === selectedSubCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = normalizeSearchText(searchQuery);
      filtered = filtered.filter(product => 
        normalizeSearchText(product.name).includes(query) ||
        normalizeSearchText(product.category).includes(query) ||
        (product.subCategory && normalizeSearchText(product.subCategory).includes(query)) ||
        (product.brand && normalizeSearchText(product.brand).includes(query))
      );
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
        sorted.sort((a, b) => a.stockCafetin - b.stockCafetin);
        break;
      case 'stock-desc':
        sorted.sort((a, b) => b.stockCafetin - a.stockCafetin);
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }
    
    return sorted;
  }, [products, selectedSubCategory, searchQuery, sortOrder]);
  
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
          subtitle="Inventario del Cafetín"
        />
        <div className="text-center py-12 text-gray-500">
          <p>Cargando inventario...</p>
        </div>
      </PageContainer>
    );
  }
  
  return (
    <PageContainer>
      <RequesterHeader 
        title="Stock"
        subtitle="Inventario del Cafetín"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Subcategory Selector */}
          <div>
            <label htmlFor="subcategory-select" className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por subcategoría
            </label>
            <select
              id="subcategory-select"
              value={selectedSubCategory}
              onChange={(e) => setSelectedSubCategory(e.target.value)}
              disabled={subCategories.length <= 1}
              className="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              <option value="All">Todas las subcategorías</option>
              {subCategories.filter(subCat => subCat !== 'All').map(subCategory => (
                <option key={subCategory} value={subCategory}>{subCategory}</option>
              ))}
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
        {(searchQuery || selectedSubCategory !== 'All' || sortOrder !== 'name-asc') && (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedSubCategory('All');
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
      
      {/* Stock List */}
      <div className="space-y-3 w-full">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No se encontraron productos</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const lowStock = isLowStock(product);
            
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
                      <h3 className="text-base sm:text-lg font-semibold text-emerald-600 mb-1 overflow-wrap-anywhere">
                        {product.name}
                      </h3>
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
                          Stock Cafetín:
                        </span>
                        <span className={`text-lg sm:text-xl font-bold ${
                          product.stockCafetin === 0 ? 'text-gray-400' : 'text-gray-900'
                        }`}>
                          {product.stockCafetin}
                        </span>
                        <span className="text-sm text-gray-500">
                          {product.baseUnit}
                        </span>
                      </div>
                    </div>
                    
                    {/* Right Side - Status Badge */}
                    <div className="flex items-start gap-2 sm:flex-col sm:items-end">
                      {lowStock ? (
                        <Badge variant="bajo-minimo">Bajo Stock</Badge>
                      ) : (
                        <Badge variant="ok">OK</Badge>
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
  );
}
