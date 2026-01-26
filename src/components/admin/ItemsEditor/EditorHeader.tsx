'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { StatsCards } from './StatsCards';

interface EditorHeaderProps {
  totalItems: number;
  activeItems: number;
  lowStockItems: number;
  filteredItems: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatus: 'all' | 'active' | 'inactive' | 'low_stock';
  onFilterChange: (status: 'all' | 'active' | 'inactive' | 'low_stock') => void;
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  availableCategories: string[];
  onExportCSV: () => void;
  onImportCSV: (file: File) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  selectedTable?: 'products' | 'inventory' | 'movements';
  selectedLocation?: 'all' | 'almacen' | 'cafetin';
  onLocationChange?: (location: 'all' | 'almacen' | 'cafetin') => void;
}

export function EditorHeader({
  totalItems,
  activeItems,
  lowStockItems,
  filteredItems,
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterChange,
  selectedCategories,
  onCategoryToggle,
  availableCategories,
  onExportCSV,
  onImportCSV,
  isSidebarOpen,
  onToggleSidebar,
  selectedTable,
  selectedLocation,
  onLocationChange,
}: EditorHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleImportClick = () => {
    fileInputRef.current?.click();
    setIsMobileMenuOpen(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportCSV(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filterButtons = [
    { key: 'all' as const, label: 'Todos', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { key: 'active' as const, label: 'Activos', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'inactive' as const, label: 'Inactivos', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'low_stock' as const, label: 'Bajo Stock', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  ];

  return (
    <div className="mb-8 space-y-6 w-full max-w-full relative">
      {/* Mobile Menu Button - Top Right */}
      <div className="lg:hidden absolute top-0 right-0 z-30">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors touch-target shadow-sm"
          aria-label="Menú de acciones"
          aria-expanded={isMobileMenuOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
        
        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
              <button
                onClick={() => {
                  onExportCSV();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 touch-target"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar CSV
              </button>
              <button
                onClick={handleImportClick}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 touch-target"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importar CSV
              </button>
            </div>
          </>
        )}
      </div>

      {/* Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pr-12 lg:pr-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editor de Items
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5">
            Gestión avanzada de inventario - {filteredItems} {filteredItems === 1 ? 'item' : 'items'} {filteredItems !== totalItems && `de ${totalItems} total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop Actions */}
          <div className="hidden lg:flex flex-wrap items-center gap-2 sm:gap-3">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors touch-target"
                aria-label={isSidebarOpen ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
                title={isSidebarOpen ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
              >
                <svg
                  className={`w-5 h-5 transition-transform duration-300 ${isSidebarOpen ? '' : 'rotate-180'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
            <Button
              variant="secondary"
              onClick={onExportCSV}
              className="flex items-center gap-2"
              title="Exportar inventario a CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden xl:inline">Exportar CSV</span>
            </Button>
            <Button
              variant="secondary"
              onClick={handleImportClick}
              className="flex items-center gap-2"
              title="Importar items desde CSV"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="hidden xl:inline">Importar CSV</span>
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards
        totalItems={totalItems}
        activeItems={activeItems}
        lowStockItems={lowStockItems}
        filteredItems={filteredItems}
      />

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar por nombre, categoría, marca..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-12 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm transition-all text-sm sm:text-base"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider shrink-0">Filtros:</span>
          </div>
          <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
            <div className="flex items-center gap-2 min-w-max pb-2">
              {filterButtons.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => onFilterChange(filter.key)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all touch-target whitespace-nowrap ${
                    filterStatus === filter.key
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={filter.icon} />
                  </svg>
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Location Filter - Only show for inventory table */}
        {selectedTable === 'inventory' && selectedLocation !== undefined && onLocationChange && (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider shrink-0">Ubicación:</span>
            </div>
            <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
              <div className="flex items-center gap-2 min-w-max pb-2">
                {[
                  { key: 'all' as const, label: 'Todas' },
                  { key: 'almacen' as const, label: 'Almacén' },
                  { key: 'cafetin' as const, label: 'Cafetín' },
                ].map((location) => (
                  <button
                    key={location.key}
                    onClick={() => onLocationChange(location.key)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all touch-target whitespace-nowrap ${
                      selectedLocation === location.key
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {location.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category Filters */}
        {availableCategories.length > 0 && (
          <div className="w-full">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider shrink-0">Categorías:</span>
            </div>
            <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
              <div className="flex items-center gap-2 min-w-max pb-2">
                {availableCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => onCategoryToggle(category)}
                    className={`inline-flex items-center px-3 py-2 rounded-full text-xs font-medium transition-all touch-target whitespace-nowrap ${
                      selectedCategories.includes(category)
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
