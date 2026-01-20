'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/layout/PageContainer';
import { Navbar } from '@/components/layout/Navbar';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { Area } from '@/types';

export default function CreateOrderPage() {
  const router = useRouter();
  const items = useQuery(api.items.list);
  const createOrder = useMutation(api.orders.create);
  const lastOrder = useQuery(
    api.orders.getLastByArea,
    { area: 'Cocina' } // Will be updated when selectedArea changes
  );
  
  const [selectedArea, setSelectedArea] = useState<Area>('Cocina');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [suggestedQuantities, setSuggestedQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  // Get last order for selected area
  const lastOrderForArea = useQuery(
    api.orders.getLastByArea,
    { area: selectedArea }
  );

  // Get order with items if last order exists
  const lastOrderWithItems = useQuery(
    api.orders.getById,
    lastOrderForArea ? { id: lastOrderForArea._id } : "skip"
  );
  
  // Pre-fill quantities when area changes
  useEffect(() => {
    if (lastOrderWithItems?.items) {
      const suggested: Record<string, number> = {};
      lastOrderWithItems.items.forEach((item: any) => {
        suggested[item._id] = item.cantidad;
      });
      setSuggestedQuantities(suggested);
      setQuantities(suggested);
    } else {
      setSuggestedQuantities({});
      setQuantities({});
    }
  }, [lastOrderWithItems, selectedArea]);
  
  const handleQuantityChange = (itemId: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, value),
    }));
  };
  
  const handleUsePreviousOrder = () => {
    if (lastOrderWithItems?.items) {
      const newQuantities: Record<string, number> = {};
      lastOrderWithItems.items.forEach((item: any) => {
        newQuantities[item._id] = item.cantidad;
      });
      setQuantities(newQuantities);
      setSuccessMessage('Pedido anterior cargado');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
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
      setSuccessMessage('Pedido enviado a almacén');
      setIsSubmitting(false);
      
      // Clear form
      setQuantities({});
      setSuggestedQuantities({});
      
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
  
  // Get all unique subcategories
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

  // Filter items by search and subcategory
  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    
    return items.filter(item => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.marca && item.marca.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.subcategoria && item.subcategoria.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Subcategory filter
      const matchesSubcategory = selectedSubcategory === 'all' || 
        item.subcategoria === selectedSubcategory;
      
      return matchesSearch && matchesSubcategory;
    });
  }, [items, searchQuery, selectedSubcategory]);

  // Group filtered items by category
  const itemsByCategory = useMemo(() => {
    if (!filteredItems || filteredItems.length === 0) {
      return {};
    }
    return filteredItems.reduce((acc, item) => {
      if (!acc[item.categoria]) {
        acc[item.categoria] = [];
      }
      acc[item.categoria].push(item);
      return acc;
    }, {} as Record<string, typeof filteredItems>);
  }, [filteredItems]);
  
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
      <Navbar />
      <PageContainer>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Crear pedido – {selectedArea}</h1>
          <p className="text-sm text-gray-500 mt-1">¿Qué pido y cuánto?</p>
        </div>
        
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
                        {item.cantidad} {item.unidad}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <form id="pedido-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
                Área
              </label>
              <select
                id="area"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value as Area)}
                className="block w-full max-w-xs h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="Cocina">Cocina</option>
                <option value="Cafetín">Cafetín</option>
                <option value="Limpieza">Limpieza</option>
              </select>
            </div>
            
            {/* Recurring Orders Button (Mejora #6) */}
            {lastOrderForArea && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleUsePreviousOrder}
                className="px-6 py-2"
              >
                Usar pedido anterior
              </Button>
            )}
          </div>
          
          {/* Search and Filter Section */}
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-3 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar producto
                </label>
                <input
                  id="search"
                  type="text"
                  placeholder="Buscar por nombre, marca o subcategoría..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                />
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
              Object.entries(itemsByCategory).map(([categoria, categoriaItems]) => (
              <div key={categoria} className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">{categoria}</h3>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="divide-y divide-gray-200">
                    {categoriaItems.map((item) => (
                      <div key={item._id} className="p-3 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="mb-1">
                            <span className="text-lg md:text-base font-semibold text-gray-900 truncate block">
                              {item.nombre}
                            </span>
                          </div>
                          <div className="mb-0">
                            <span className="text-xs text-gray-500 truncate block">
                              {item.categoria}
                              {item.subcategoria && ` · ${item.subcategoria}`}
                              {item.marca && item.marca !== 'Genérica' && ` · ${item.marca}`}
                            </span>
                          </div>
                        </div>
                        <div className="w-full md:w-auto md:ml-4 flex justify-center md:justify-end">
                          <QuantityInput
                            itemId={item._id}
                            value={quantities[item._id] || 0}
                            onChange={(value) => handleQuantityChange(item._id, value)}
                            min={0}
                            max={item.stock_actual}
                            unit={item.unidad}
                            suggested={suggestedQuantities[item._id] !== undefined && quantities[item._id] === suggestedQuantities[item._id]}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </form>
        
        {/* Sticky CTA Button */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 md:px-6 py-2 md:py-3 shadow-lg mt-6 -mx-4 md:-mx-6 flex items-stretch">
          <Button
            type="submit"
            form="pedido-form"
            variant="primary"
            disabled={isSubmitting}
            className="w-full md:w-auto h-full py-2 md:py-3"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar a almacén'}
          </Button>
        </div>
      </PageContainer>
    </div>
  );
}
