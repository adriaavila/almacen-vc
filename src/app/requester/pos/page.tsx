'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { RequesterHeader } from '@/components/requester/RequesterHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { getUserArea } from '@/lib/auth';
import { normalizeSearchText } from '@/lib/utils';

type CartItem = {
  itemId: Id<"items">;
  nombre: string;
  cantidad: number;
  precio: number; // Precio unitario (por ahora placeholder)
  unidad: string;
};

export default function POSPage() {
  const userArea = getUserArea();
  // Get items for Cafetín (POS is for Cafetín)
  const items = useQuery(api.items.listItemsForRole, { role: 'Cafetín' });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories
  const categories = useMemo(() => {
    if (!items || items.length === 0) return [];
    const cats = Array.from(new Set(items.map(item => item.categoria)));
    return ['all', ...cats];
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    
    let filtered = items.filter(item => item.stock_actual > 0); // Only items with stock
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.categoria === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = normalizeSearchText(searchQuery);
      filtered = filtered.filter(item => 
        normalizeSearchText(item.nombre).includes(query) ||
        normalizeSearchText(item.categoria).includes(query) ||
        (item.subcategoria && normalizeSearchText(item.subcategoria).includes(query))
      );
    }
    
    return filtered;
  }, [items, selectedCategory, searchQuery]);

  const addToCart = (item: NonNullable<typeof items>[number]) => {
    const existingItem = cart.find(c => c.itemId === item._id);
    if (existingItem) {
      // Increase quantity
      setCart(cart.map(c => 
        c.itemId === item._id 
          ? { ...c, cantidad: c.cantidad + 1 }
          : c
      ));
    } else {
      // Add new item to cart (precio placeholder - en producción vendría de la BD)
      setCart([...cart, {
        itemId: item._id,
        nombre: item.nombre,
        cantidad: 1,
        precio: 0, // TODO: Get from item data or separate pricing table
        unidad: item.unidad,
      }]);
    }
  };

  const updateCartQuantity = (itemId: Id<"items">, cantidad: number) => {
    if (cantidad <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(item => 
        item.itemId === itemId 
          ? { ...item, cantidad }
          : item
      ));
    }
  };

  const removeFromCart = (itemId: Id<"items">) => {
    setCart(cart.filter(item => item.itemId !== itemId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  }, [cart]);

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }
    // TODO: Implement actual checkout logic
    alert(`Venta procesada: ${cart.length} items, Total: $${subtotal.toFixed(2)}`);
    clearCart();
  };

  if (items === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageContainer>
          <div className="text-center py-12 text-gray-500">
            <p>Cargando productos...</p>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer>
        <RequesterHeader 
          title="Punto de Venta"
          subtitle="Cafetín - Venta al público"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2">
            {/* Search and Filter */}
            <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                    Buscar producto
                  </label>
                  <input
                    id="search"
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    id="category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="block w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="all">Todas las categorías</option>
                    {categories.filter(c => c !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Productos Disponibles</h2>
              
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay productos disponibles</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredItems.map((item) => (
                    <button
                      key={item._id}
                      onClick={() => addToCart(item)}
                      className="p-3 border border-gray-200 rounded-md hover:border-emerald-500 hover:bg-emerald-50 transition-colors text-left"
                    >
                      <div className="mb-2">
                        <h3 className="font-medium text-gray-900 text-sm truncate">{item.nombre}</h3>
                        <p className="text-xs text-gray-500">{item.categoria}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant={item.status === 'bajo_stock' ? 'bajo-minimo' : 'ok'}>
                          Stock: {item.stock_actual} {item.unidad}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Carrito</h2>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <p>El carrito está vacío</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.itemId} className="border border-gray-200 rounded-md p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 text-sm truncate">{item.nombre}</h3>
                            <p className="text-xs text-gray-500">{item.unidad}</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.itemId)}
                            className="ml-2 text-red-600 hover:text-red-800"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <QuantityInput
                            itemId={item.itemId}
                            value={item.cantidad}
                            onChange={(value) => updateCartQuantity(item.itemId, value)}
                            min={1}
                            max={items.find(i => i._id === item.itemId)?.stock_actual || 1}
                            unit={item.unidad}
                          />
                          <span className="text-sm font-semibold text-gray-900 ml-2">
                            ${(item.precio * item.cantidad).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Subtotal</span>
                      <span className="text-lg font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
                    </div>
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={handleCheckout}
                    >
                      Procesar Venta
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
