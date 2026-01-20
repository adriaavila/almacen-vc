'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

interface ItemAutocompleteProps {
  value: Id<'items'> | null;
  onChange: (itemId: Id<'items'> | null, item: any) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

type ConvexItem = {
  _id: Id<'items'>;
  nombre: string;
  categoria: string;
  subcategoria?: string;
  marca?: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  package_size?: string;
  location: string;
  extra_notes?: string;
  status: 'ok' | 'bajo_stock';
};

export function ItemAutocomplete({
  value,
  onChange,
  placeholder = 'Buscar producto...',
  className = '',
  autoFocus = false,
}: ItemAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const items = useQuery(api.items.list);

  // Get selected item name for display
  const selectedItem = useMemo(() => {
    if (!value || !items) return null;
    return items.find((item) => item._id === value);
  }, [value, items]);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!items || !searchQuery.trim()) {
      return items || [];
    }

    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      const nombreMatch = item.nombre.toLowerCase().includes(query);
      const categoriaMatch = item.categoria.toLowerCase().includes(query);
      const subcategoriaMatch = item.subcategoria?.toLowerCase().includes(query);
      const marcaMatch = item.marca?.toLowerCase().includes(query);

      return nombreMatch || categoriaMatch || subcategoriaMatch || marcaMatch;
    });
  }, [items, searchQuery]);

  // Handle item selection
  const handleSelect = (item: ConvexItem) => {
    onChange(item._id, item);
    setSearchQuery(item.nombre);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredItems.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredItems.length) {
          handleSelect(filteredItems[selectedIndex]);
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

  // Update search query when selected item changes
  useEffect(() => {
    if (selectedItem && !isOpen) {
      setSearchQuery(selectedItem.nombre);
    }
  }, [selectedItem, isOpen]);

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
          className="block w-full h-12 pl-10 pr-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
        />
      </div>

      {/* Dropdown */}
      {isOpen && filteredItems.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredItems.map((item, index) => (
            <button
              key={item._id}
              type="button"
              onClick={() => handleSelect(item)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors ${
                index === selectedIndex ? 'bg-gray-50' : ''
              } ${
                item.status === 'bajo_stock' ? 'border-l-4 border-l-red-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.nombre}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{item.categoria}</span>
                    {item.subcategoria && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{item.subcategoria}</span>
                      </>
                    )}
                    {item.marca && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{item.marca}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {item.stock_actual} {item.unidad}
                  </p>
                  {item.status === 'bajo_stock' && (
                    <p className="text-xs text-red-600">Bajo stock</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && searchQuery.trim() && filteredItems.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4">
          <p className="text-sm text-gray-500 text-center">
            No se encontraron productos
          </p>
        </div>
      )}
    </div>
  );
}
