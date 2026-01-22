'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { normalizeSearchText } from '@/lib/utils';

interface ActivoAutocompleteProps {
  value: Id<'activos'> | null;
  onChange: (activoId: Id<'activos'> | null, activo: any) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

type ConvexActivo = {
  _id: Id<'activos'>;
  nombre: string;
  tipo: string;
  ubicacion: string;
  estado: 'operativo' | 'en_reparacion' | 'fuera_servicio';
  descripcion?: string;
};

export function ActivoAutocomplete({
  value,
  onChange,
  placeholder = 'Buscar activo...',
  className = '',
  autoFocus = false,
}: ActivoAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activos = useQuery(api.activos.list);

  // Get selected activo name for display
  const selectedActivo = useMemo(() => {
    if (!value || !activos) return null;
    return activos.find((a) => a._id === value);
  }, [value, activos]);

  // Filter activos based on search query
  const filteredActivos = useMemo(() => {
    if (!activos || !searchQuery.trim()) {
      return activos || [];
    }

    const query = normalizeSearchText(searchQuery);
    return activos.filter((activo) => {
      const nombreMatch = normalizeSearchText(activo.nombre).includes(query);
      const tipoMatch = normalizeSearchText(activo.tipo).includes(query);
      const ubicacionMatch = normalizeSearchText(activo.ubicacion).includes(query);
      const descripcionMatch = activo.descripcion ? normalizeSearchText(activo.descripcion).includes(query) : false;

      return nombreMatch || tipoMatch || ubicacionMatch || descripcionMatch;
    });
  }, [activos, searchQuery]);

  // Handle activo selection
  const handleSelect = (activo: ConvexActivo) => {
    onChange(activo._id, activo);
    setSearchQuery(activo.nombre);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredActivos.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredActivos.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredActivos.length) {
          handleSelect(filteredActivos[selectedIndex]);
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

  // Update search query when selected activo changes
  useEffect(() => {
    if (selectedActivo && !isOpen) {
      setSearchQuery(selectedActivo.nombre);
    }
  }, [selectedActivo, isOpen]);

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'operativo':
        return 'Operativo';
      case 'en_reparacion':
        return 'En Reparación';
      case 'fuera_servicio':
        return 'Fuera de Servicio';
      default:
        return estado;
    }
  };

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
      {isOpen && filteredActivos.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredActivos.map((activo, index) => (
            <button
              key={activo._id}
              type="button"
              onClick={() => handleSelect(activo)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors ${
                index === selectedIndex ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activo.nombre}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{activo.tipo}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{activo.ubicacion}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{getEstadoLabel(activo.estado)}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && searchQuery.trim() && filteredActivos.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4">
          <p className="text-sm text-gray-500 text-center">
            No se encontraron activos
          </p>
        </div>
      )}
    </div>
  );
}
