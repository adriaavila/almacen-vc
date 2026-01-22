'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { useRef } from 'react';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/layout/PageContainer';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { setUserArea, getUserArea } from '@/lib/auth';
import { pluralizeUnit, normalizeSearchText } from '@/lib/utils';
import { Area } from '@/types';

const validAreas: Area[] = ['Cocina', 'Cafetín', 'Limpieza'];

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
  
  // Use role-based query to get items filtered by area
  const items = useQuery(api.items.listItemsForRole, { role: selectedArea });
  const createOrder = useMutation(api.orders.create);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [orderListPhoto, setOrderListPhoto] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
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
  
  const handleQuantityChange = (itemId: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, value),
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    
    try {
      const orderItems = Object.entries(quantities)
        .filter(([_, cantidad]) => cantidad > 0)
        .map(([itemId, cantidad]) => ({ 
          itemId: itemId as Id<"items">, 
          cantidad 
        }));
      
      if (orderItems.length === 0) {
        setError('Debe seleccionar al menos un ítem');
        setIsSubmitting(false);
        return;
      }
      
      await createOrder({
        area: selectedArea,
        items: orderItems,
      });
      
      // Immediate feedback
      setSuccessMessage('Pedido enviado');
      setIsSubmitting(false);
      
      // Clear form
      setQuantities({});
      setOrderListPhoto(null);
      
      // Optional redirect after 1.5 seconds
      setTimeout(() => {
        router.push('/requester/mis-pedidos');
      }, 1500);
    } catch (err) {
      console.error('Error al crear pedido:', err);
      setError('No se pudo enviar el pedido. Intente de nuevo.');
      setIsSubmitting(false);
    }
  };
  
  // Get all unique subcategories from filtered items
  const subcategories = useMemo(() => {
    if (!items || items.length === 0) return [];
    const subcats = new Set<string>();
    items.forEach(item => {
      if (item.subcategoria) {
        subcats.add(item.subcategoria);
      }
    });
    return Array.from(subcats).sort();
  }, [items]);

  // Filter items by search and subcategory (area filtering is already done by the query)
  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    
    return items.filter(item => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        normalizeSearchText(item.nombre).includes(normalizeSearchText(searchQuery)) ||
        (item.subcategoria && normalizeSearchText(item.subcategoria).includes(normalizeSearchText(searchQuery)));
      
      // Subcategory filter
      const matchesSubcategory = selectedSubcategory === 'all' || 
        item.subcategoria === selectedSubcategory;
      
      return matchesSearch && matchesSubcategory;
    });
  }, [items, searchQuery, selectedSubcategory]);

  // Group filtered items by category and sort by name
  const itemsByCategory = useMemo(() => {
    if (!filteredItems || filteredItems.length === 0) {
      return {};
    }
    const grouped = filteredItems.reduce((acc, item) => {
      if (!acc[item.categoria]) {
        acc[item.categoria] = [];
      }
      acc[item.categoria].push(item);
      return acc;
    }, {} as Record<string, typeof filteredItems>);
    
    // Sort items by name within each category
    Object.keys(grouped).forEach(categoria => {
      grouped[categoria].sort((a, b) => 
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
      );
    });
    
    // Initialize expanded state for new categories (default: expanded)
    setExpandedCategories(prev => {
      const updated = { ...prev };
      Object.keys(grouped).forEach(categoria => {
        if (!(categoria in updated)) {
          updated[categoria] = true;
        }
      });
      return updated;
    });
    
    return grouped;
  }, [filteredItems]);
  
  const toggleCategory = (categoria: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoria]: !prev[categoria]
    }));
  };
  
  // Calculate selected items
  const selectedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return Object.entries(quantities)
      .filter(([_, cantidad]) => cantidad > 0)
      .map(([itemId, cantidad]) => {
        const item = items.find(i => i._id === itemId);
        return item ? { ...item, cantidad } : null;
      })
      .filter(Boolean) as Array<typeof items[0] & { cantidad: number }>;
  }, [quantities, items]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800">
            {successMessage}
          </div>
        )}
        
        {/* Selected Items Summary Panel */}
        {selectedItems.length > 0 && (
          <div className="sticky top-0 z-10 bg-white border-t-4 border-t-emerald-500 rounded-md shadow-sm mb-4">
            <button
              type="button"
              onClick={() => setSummaryExpanded(!summaryExpanded)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Seleccionados</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                  {selectedItems.length}
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
              <div className="border-t border-gray-200 p-3 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {selectedItems.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between bg-gray-50 rounded-md p-2 border border-gray-200"
                    >
                      <span className="text-sm font-medium text-gray-900 truncate flex-1 mr-2">
                        {item.nombre}
                      </span>
                      <span className="text-sm text-gray-600 whitespace-nowrap">
                        {item.cantidad} {pluralizeUnit(item.unidad, item.cantidad)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
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
                    placeholder="Buscar por nombre, marca o subcategoría..."
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
                  ({filteredItems.length} {filteredItems.length === 1 ? 'producto encontrado' : 'productos encontrados'})
                </span>
              </div>
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Productos Disponibles</h2>
            
            {Object.keys(itemsByCategory).length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-500">
                  {searchQuery || selectedSubcategory !== 'all' 
                    ? 'No se encontraron productos con los filtros seleccionados' 
                    : 'No hay productos disponibles'}
                </p>
              </div>
            ) : (
              Object.entries(itemsByCategory).map(([categoria, categoriaItems]) => {
                const isExpanded = expandedCategories[categoria] !== false; // Default to true
                return (
                  <div key={categoria} className="mb-6">
                    <button
                      type="button"
                      onClick={() => toggleCategory(categoria)}
                      className="flex items-center gap-2 text-lg font-medium text-gray-800 mb-3 hover:text-gray-900 transition-colors"
                    >
                      <svg
                        className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span>{categoria}</span>
                    </button>
                    {isExpanded && (
                      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="divide-y divide-gray-200">
                          {categoriaItems.map((item) => (
                            <div key={item._id} className="py-1.5 px-2 md:px-3 flex flex-row items-center justify-between gap-2 md:gap-3 hover:bg-gray-50 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="mb-0">
                                  <span className="text-sm font-semibold text-gray-900 truncate block">
                                    {item.nombre}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 truncate block">
                                    {item.categoria}
                                    {item.subcategoria && ` · ${item.subcategoria}`}
                                    {/* Brand is hidden for workers (aggregated view) */}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0">
                                <QuantityInput
                                  itemId={item._id}
                                  value={quantities[item._id] || 0}
                                  onChange={(value) => handleQuantityChange(item._id, value)}
                                  min={0}
                                  max={item.stock_actual}
                                  unit={item.unidad}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </form>
        
        {/* Sticky CTA Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 md:px-6 py-2 md:py-3 shadow-lg mt-6 -mx-4 md:-mx-6 flex items-center gap-2 flex-wrap">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            aria-hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setOrderListPhoto(f);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => photoInputRef.current?.click()}
            className="h-full py-2 md:py-3 px-3 md:px-4 shrink-0"
            title="Subir foto de la lista de pedidos"
          >
            <Camera className="w-5 h-5 md:mr-1.5" />
            <span className="hidden md:inline">
              {orderListPhoto ? 'Foto adjunta' : 'Foto lista'}
            </span>
          </Button>
          <Button
            type="submit"
            form="pedido-form"
            variant="primary"
            disabled={isSubmitting}
            className="flex-1 md:flex-initial h-full py-2 md:py-3"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </PageContainer>
    </div>
  );
}

export default function CreateOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <PageContainer>
          <div className="text-center py-12 text-gray-500">
            <p>Cargando...</p>
          </div>
        </PageContainer>
      </div>
    }>
      <CreateOrderPageContent />
    </Suspense>
  );
}
