'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { normalizeSearchText } from '@/lib/utils';
import { useInventorySync } from '@/lib/hooks/useInventorySync';
import { useInventoryData } from '@/lib/hooks/useInventoryData';

interface ItemAutocompleteProps {
  value: Id<'products'> | null;
  onChange: (productId: Id<'products'> | null, product: ConvexProduct | null) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  showCreateOption?: boolean;
  onCreateNew?: () => void;
  categoryFilter?: string | string[]; // Added category filter
}

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

export function ItemAutocomplete({
  value,
  onChange,
  placeholder = 'Buscar producto...',
  className = '',
  autoFocus = false,
  showCreateOption = true,
  onCreateNew,
  categoryFilter,
}: ItemAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sincronizar datos de Convex al store de Zustand
  useInventorySync();

  // Obtener datos híbridos (Convex o cache)
  const products = useInventoryData();

  // Get selected product for display
  const selectedProduct = useMemo(() => {
    if (!value || !products) return null;
    return products.find((product) => product._id === value);
  }, [value, products]);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    // Only show active products
    let activeProducts = products.filter((p) => p.active);

    // Apply category filter if provided
    if (categoryFilter) {
      const filters = Array.isArray(categoryFilter) ? categoryFilter : [categoryFilter];
      activeProducts = activeProducts.filter(p => filters.some(f => p.category.toLowerCase() === f.toLowerCase()));
    }

    if (!searchQuery.trim()) {
      return activeProducts;
    }

    const query = normalizeSearchText(searchQuery);
    return activeProducts.filter((product) => {
      const nameMatch = normalizeSearchText(product.name).includes(query);
      const categoryMatch = normalizeSearchText(product.category).includes(query);
      const subCategoryMatch = product.subCategory ? normalizeSearchText(product.subCategory).includes(query) : false;
      const brandMatch = product.brand ? normalizeSearchText(product.brand).includes(query) : false;

      return nameMatch || categoryMatch || subCategoryMatch || brandMatch;
    });
  }, [products, searchQuery, categoryFilter]);

  // Handle product selection
  const handleSelect = (product: ConvexProduct) => {
    onChange(product._id, product);
    setSearchQuery(product.name);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Calculate total items including create button
  const totalItems = filteredProducts.length + (showCreateOption && onCreateNew ? 1 : 0);
  const createButtonIndex = showCreateOption && onCreateNew ? filteredProducts.length : -1;

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (totalItems > 0) {
          setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex === createButtonIndex && onCreateNew) {
          onCreateNew();
          setIsOpen(false);
          setSelectedIndex(-1);
        } else if (selectedIndex >= 0 && selectedIndex < filteredProducts.length) {
          handleSelect(filteredProducts[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Update search query when selected product changes
  useEffect(() => {
    if (selectedProduct && !isOpen) {
      setSearchQuery(selectedProduct.name);
    } else if (value && !selectedProduct && !isOpen) {
      // Product is selected but not in the list yet (e.g., just created)
      // Keep the current search query or clear it
      // The product will appear in the list once the query updates
    }
  }, [selectedProduct, isOpen, value]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
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
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
            if (value) {
              onChange(null, null);
            }
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="block w-full h-12 pl-10 pr-10 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              if (value) {
                onChange(null, null);
              }
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
            title="Limpiar búsqueda"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (filteredProducts.length > 0 || (showCreateOption && onCreateNew)) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredProducts.map((product, index) => (
            <button
              key={product._id}
              type="button"
              onClick={() => handleSelect(product)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors ${index === selectedIndex ? 'bg-gray-50' : ''
                } ${product.status === 'bajo_stock' ? 'border-l-4 border-l-red-500' : ''
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{product.category}</span>
                    {product.subCategory && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{product.subCategory}</span>
                      </>
                    )}
                    {product.brand && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{product.brand}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {product.totalStock} {product.baseUnit}
                  </p>
                  {product.status === 'bajo_stock' && (
                    <p className="text-xs text-red-600">Bajo stock</p>
                  )}
                </div>
              </div>
            </button>
          ))}

          {/* Create new product button */}
          {showCreateOption && onCreateNew && (
            <button
              type="button"
              onClick={() => {
                onCreateNew();
                setIsOpen(false);
                setSelectedIndex(-1);
              }}
              className={`w-full text-left px-4 py-3 border-t border-gray-200 bg-gray-50 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors ${createButtonIndex === selectedIndex ? 'bg-gray-100' : ''
                }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">➕</span>
                <span className="text-sm font-medium text-emerald-600">
                  Crear nuevo producto
                </span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* No results */}
      {isOpen && searchQuery.trim() && filteredProducts.length === 0 && !(showCreateOption && onCreateNew) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4">
          <p className="text-sm text-gray-500 text-center">
            No se encontraron productos
          </p>
        </div>
      )}
    </div>
  );
}
