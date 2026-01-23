'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { normalizeSearchText } from '@/lib/utils';

type ConvexItem = {
  _id: Id<"items">;
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
  status: "ok" | "bajo_stock";
};

export default function InventoryPage() {
  const items = useQuery(api.items.list);
  const updateStock = useMutation(api.items.updateStock);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [adjustingId, setAdjustingId] = useState<Id<"items"> | null>(null);
  const [adjustValue, setAdjustValue] = useState<string>('0');
  const [editingItem, setEditingItem] = useState<ConvexItem | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  // Get unique categories
  const categories = useMemo(() => {
    if (!items || items.length === 0) return [];
    const cats = Array.from(new Set(items.map(item => item.categoria)));
    return ['All', ...cats];
  }, [items]);
  
  // Filter and search items
  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    
    let filtered = items;
    
    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.categoria === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = normalizeSearchText(searchQuery);
      filtered = filtered.filter(item => 
        normalizeSearchText(item.nombre).includes(query) ||
        normalizeSearchText(item.categoria).includes(query) ||
        (item.subcategoria && normalizeSearchText(item.subcategoria).includes(query)) ||
        (item.marca && normalizeSearchText(item.marca).includes(query))
      );
    }
    
    return filtered;
  }, [items, selectedCategory, searchQuery]);
  
  const handleAdjustClick = (item: ConvexItem, delta?: number) => {
    if (adjustingId === item._id) {
      // Already adjusting this item, apply delta
      if (delta !== undefined) {
        const currentValue = parseInt(adjustValue, 10) || 0;
        const newValue = currentValue + delta;
        if (newValue < 0) return;
        setAdjustValue(newValue.toString());
      }
    } else {
      // Start adjusting this item
      setAdjustingId(item._id);
      if (delta !== undefined) {
        setAdjustValue(delta > 0 ? '1' : '0');
      } else {
        setAdjustValue('0');
      }
    }
  };
  
  const handleQuickAdjust = async (itemId: Id<"items">, delta: number) => {
    if (!items) return;
    const item = items.find(i => i._id === itemId);
    if (!item) return;
    
    const newStock = item.stock_actual + delta;
    if (newStock < 0) return;
    
    try {
      await updateStock({ id: itemId, newStock });
    } catch (error) {
      console.error('Error al actualizar stock:', error);
    }
  };
  
  const handleSaveAdjustment = async (itemId: Id<"items">) => {
    if (!items) return;
    const numValue = parseInt(adjustValue, 10);
    const item = items.find(i => i._id === itemId);
    
    if (!item || isNaN(numValue)) return;
    
    const newStock = item.stock_actual + numValue;
    if (newStock < 0) return;
    
    try {
      await updateStock({ id: itemId, newStock });
      setAdjustingId(null);
      setAdjustValue('0');
    } catch (error) {
      console.error('Error al actualizar stock:', error);
    }
  };
  
  const handleCancelAdjustment = () => {
    setAdjustingId(null);
    setAdjustValue('0');
  };
  
  const handleDirectEdit = (item: ConvexItem) => {
    setEditingItem(item);
    setEditValue(item.stock_actual.toString());
  };

  const handleSaveDirectEdit = async () => {
    if (!editingItem) return;
    
    const numValue = parseInt(editValue, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      try {
        await updateStock({ id: editingItem._id, newStock: numValue });
        setEditingItem(null);
        setEditValue('');
      } catch (error) {
        console.error('Error al actualizar stock:', error);
      }
    }
  };

  const handleCancelDirectEdit = () => {
    setEditingItem(null);
    setEditValue('');
  };
  
  const isLowStock = (item: ConvexItem) => {
    return item.status === 'bajo_stock';
  };
  
  const formatUnitDisplay = (item: ConvexItem) => {
    if (item.package_size) {
      return `${item.unidad} (${item.package_size})`;
    }
    return item.unidad;
  };

  // Loading state
  if (items === undefined) {
    return (
      <PageContainer>
        <AdminHeader 
          title="Inventario"
          subtitle="Gestión de productos y stock"
        />
        <div className="text-center py-12 text-gray-500">
          <p>Cargando inventario...</p>
        </div>
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
        <div className="mb-4">
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
              type="text"
              placeholder="Buscar productos, categoría, marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full h-10 pl-10 pr-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
        
        {/* Category Filters */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  selectedCategory === category
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category === 'All' ? 'Todos' : category}
              </button>
            ))}
          </div>
        </div>
        
        {/* Inventory List */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No se encontraron productos</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const lowStock = isLowStock(item);
              const isAdjusting = adjustingId === item._id;
              
              return (
                <div
                  key={item._id}
                  className={`bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden ${
                    lowStock ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-emerald-500'
                  }`}
                >
                  <div className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      {/* Left Side - Product Info */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/admin/inventario/${item._id}`}>
                          <h3 className="text-base sm:text-lg font-semibold text-emerald-600 hover:text-emerald-800 mb-1 cursor-pointer break-words">
                            {item.nombre}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {item.subcategoria || item.categoria}
                          </span>
                          {item.marca && item.marca !== 'Genérica' && (
                            <span className="text-xs text-gray-500">
                              {item.marca}
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                          {formatUnitDisplay(item)}
                          {item.extra_notes && (
                            <span className="ml-2 text-gray-400 hidden sm:inline">• {item.extra_notes}</span>
                          )}
                        </div>
                        {item.extra_notes && (
                          <div className="text-xs text-gray-400 mb-2 sm:hidden">
                            {item.extra_notes}
                          </div>
                        )}
                        
                        {/* Stock Display */}
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-xs uppercase text-gray-500 font-medium">
                            Stock Actual
                          </span>
                          <span className={`text-xl sm:text-2xl font-bold ${
                            lowStock ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {item.stock_actual}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500">
                            / {item.stock_minimo} mín
                          </span>
                        </div>
                      </div>
                      
                      {/* Right Side - Controls */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 sm:gap-3 flex-shrink-0">
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
                        {isAdjusting && adjustingId === item._id ? (
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAdjustClick(item, -1)}
                                className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={adjustValue}
                                onChange={(e) => setAdjustValue(e.target.value)}
                                className="w-16 px-2 py-1 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => handleAdjustClick(item, 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
                              >
                                +
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveAdjustment(item._id)}
                                className="px-3 py-1 text-xs font-medium text-emerald-600 hover:text-emerald-800"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={handleCancelAdjustment}
                                className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button
                              onClick={() => handleQuickAdjust(item._id, -1)}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium text-sm sm:text-base"
                              title="Reducir stock en 1"
                            >
                              −
                            </button>
                            <button
                              onClick={() => handleAdjustClick(item)}
                              className="px-2 sm:px-3 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md bg-white whitespace-nowrap"
                              title="Ajustar cantidad"
                            >
                              Ajustar
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(item._id, 1)}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium text-sm sm:text-base"
                              title="Aumentar stock en 1"
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
      {editingItem && (
        <Modal
          isOpen={editingItem !== null}
          onClose={handleCancelDirectEdit}
          title={`Editar stock de ${editingItem.nombre}`}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="stock-input" className="block text-sm font-medium text-gray-700 mb-2">
                Stock actual
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
                Stock mínimo: {editingItem.stock_minimo} {editingItem.unidad}
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
    </>
  );
}
