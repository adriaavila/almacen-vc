'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Id } from 'convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useOfflineMutation } from '@/lib/hooks/useOfflineMutation';
import { SyncStatus } from '@/components/ui/SyncStatus';
import { SlotButton } from '@/components/ui/SlotButton';
import { ProductCard } from '@/components/pos/ProductCard';
import { CartBottomBar } from '@/components/pos/CartBottomBar';
import { TicketPanel } from '@/components/pos/TicketPanel';
import { normalizeSearchText } from '@/lib/utils';
import { usePosInventory } from '@/lib/hooks/usePosInventory';
import { useUsersData } from '@/lib/hooks/useUsersData';
import { Slot } from '@/types';

const INITIAL_SLOTS: Slot[] = [
  { id: 1, pacienteId: null, items: [] },
  { id: 2, pacienteId: null, items: [] },
  { id: 3, pacienteId: null, items: [] },
  { id: 4, pacienteId: null, items: [] },
  { id: 5, pacienteId: null, items: [] },
];

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
  availableForSale?: boolean;
  totalStock: number;
  stockAlmacen: number;
  stockCafetin: number;
  status: "ok" | "bajo_stock";
};

export default function POSPage() {
  // Data hooks
  const products = usePosInventory();
  const createOrder = useOfflineMutation('posSale');
  const users = useUsersData();
  const serverPosSalesCount = useQuery(api.pos.todayPosSalesCount);

  // Map users to pacientes
  const pacientes = useMemo(() => {
    return users?.map(u => ({ id: u._id, nombre: u.nombre, estado: u.estado })) || [];
  }, [users]);

  // State
  const [slots, setSlots] = useState<Slot[]>(() => INITIAL_SLOTS);
  const [activeSlotId, setActiveSlotId] = useState<number>(1);
  const [coffeeProductId, setCoffeeProductId] = useState<Id<"products"> | null>(null);
  const [ghostAddFeedback, setGhostAddFeedback] = useState<Record<number, boolean>>({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [localSalesOffset, setLocalSalesOffset] = useState(0);

  // Global POS order number (server count + local optimistic offset)
  const posSalesCount = (serverPosSalesCount ?? 0) + localSalesOffset;

  // Reset local offset when server catches up
  useEffect(() => {
    if (serverPosSalesCount !== undefined) {
      setLocalSalesOffset(0);
    }
  }, [serverPosSalesCount]);

  // Search & category filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Patient state
  const [currentSliderPacienteId, setCurrentSliderPacienteId] = useState<string | null>(null);

  // Find coffee product dynamically
  useEffect(() => {
    if (products && products.length > 0) {
      const coffeeProduct = products.find(product =>
        normalizeSearchText(product.name).includes('café') ||
        normalizeSearchText(product.name).includes('cafe')
      );
      if (coffeeProduct) {
        setCoffeeProductId(coffeeProduct._id);
      }
    }
  }, [products]);

  // Update default selected patient when users load
  useEffect(() => {
    if (pacientes.length > 0 && !currentSliderPacienteId) {
      setCurrentSliderPacienteId(pacientes[0].id);
    }
  }, [pacientes, currentSliderPacienteId]);

  // Active slot
  const activeSlot = useMemo(() => {
    return slots.find(s => s.id === activeSlotId) || slots[0];
  }, [slots, activeSlotId]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    let result = products.filter(product =>
      product.active &&
      product.stockCafetin > 0 &&
      product.availableForSale !== false
    );

    // Search filter
    if (searchQuery.trim()) {
      const normalized = normalizeSearchText(searchQuery);
      result = result.filter(product =>
        normalizeSearchText(product.name).includes(normalized)
      );
    }

    // Category filter
    if (activeCategory) {
      result = result.filter(product =>
        (product.subCategory?.trim() || 'Otros') === activeCategory
      );
    }

    // Sort alphabetically (top products sorting could be added when sale history is available)
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [products, searchQuery, activeCategory]);

  // Unique categories from available products
  const categories = useMemo(() => {
    if (!products) return [];
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.active && p.stockCafetin > 0 && p.availableForSale !== false) {
        cats.add(p.subCategory?.trim() || 'Otros');
      }
    });
    return Array.from(cats).sort();
  }, [products]);

  // Active slot item count
  const activeSlotItemCount = useMemo(() => {
    return activeSlot.items.reduce((sum, item) => sum + item.cantidad, 0);
  }, [activeSlot]);

  // --- Handlers ---

  const handleSlotClick = useCallback((slotId: number) => {
    setActiveSlotId(slotId);
    const newActiveSlot = slots.find(s => s.id === slotId);
    if (newActiveSlot?.pacienteId) {
      setCurrentSliderPacienteId(newActiveSlot.pacienteId);
    } else if (pacientes.length > 0) {
      setCurrentSliderPacienteId(pacientes[0].id);
    }
  }, [slots, pacientes]);

  const handleGhostAddCoffeeForSlot = useCallback((slotId: number) => {
    setActiveSlotId(slotId); // Ensure slot is active so ticket bar shows

    if (!coffeeProductId || !products) return;

    const coffeeProduct = products.find(product => product._id === coffeeProductId);
    if (!coffeeProduct) return;

    setSlots(prev => prev.map(slot => {
      if (slot.id === slotId) {
        const existingItem = slot.items.find(item => item.productId === coffeeProductId);
        if (existingItem) {
          return {
            ...slot,
            items: slot.items.map(item =>
              item.productId === coffeeProductId
                ? { ...item, cantidad: item.cantidad + 1 }
                : item
            ),
          };
        }
        return {
          ...slot,
          items: [...slot.items, {
            productId: coffeeProductId,
            nombre: coffeeProduct.name,
            cantidad: 1,
            precio: 0,
            unidad: coffeeProduct.baseUnit,
          }],
        };
      }
      return slot;
    }));

    setGhostAddFeedback(prev => ({ ...prev, [slotId]: true }));
    setTimeout(() => {
      setGhostAddFeedback(prev => ({ ...prev, [slotId]: false }));
    }, 100);
  }, [coffeeProductId, products]);

  const handleAddProduct = useCallback((product: ConvexProduct) => {
    setSlots(prev => prev.map(slot => {
      if (slot.id === activeSlotId) {
        const existingItem = slot.items.find(c => c.productId === product._id);
        if (existingItem) {
          return {
            ...slot,
            items: slot.items.map(c =>
              c.productId === product._id
                ? { ...c, cantidad: c.cantidad + 1 }
                : c
            ),
          };
        }
        return {
          ...slot,
          items: [...slot.items, {
            productId: product._id,
            nombre: product.name,
            cantidad: 1,
            precio: 0,
            unidad: product.baseUnit,
          }],
        };
      }
      return slot;
    }));
  }, [activeSlotId]);

  const handleIncreaseQuantity = useCallback((productId: Id<"products">) => {
    setSlots(prev => prev.map(slot => {
      if (slot.id === activeSlotId) {
        return {
          ...slot,
          items: slot.items.map(item =>
            item.productId === productId
              ? { ...item, cantidad: item.cantidad + 1 }
              : item
          ),
        };
      }
      return slot;
    }));
  }, [activeSlotId]);

  const handleDecreaseQuantity = useCallback((productId: Id<"products">) => {
    setSlots(prev => prev.map(slot => {
      if (slot.id === activeSlotId) {
        return {
          ...slot,
          items: slot.items.map(item =>
            item.productId === productId
              ? { ...item, cantidad: Math.max(0, item.cantidad - 1) }
              : item
          ).filter(item => item.cantidad > 0),
        };
      }
      return slot;
    }));
  }, [activeSlotId]);

  const handleRemoveItem = useCallback((productId: Id<"products">) => {
    setSlots(prev => prev.map(slot => {
      if (slot.id === activeSlotId) {
        return {
          ...slot,
          items: slot.items.filter(item => item.productId !== productId),
        };
      }
      return slot;
    }));
  }, [activeSlotId]);

  const handlePacienteChange = useCallback((pacienteId: string) => {
    setCurrentSliderPacienteId(pacienteId);
    setSlots(prev => prev.map(slot =>
      slot.id === activeSlotId
        ? { ...slot, pacienteId }
        : slot
    ));
  }, [activeSlotId]);

  const handleAddSlot = useCallback(() => {
    setSlots(prev => {
      const nextId = prev.length > 0 ? Math.max(...prev.map(s => s.id)) + 1 : 1;
      return [...prev, { id: nextId, pacienteId: null, items: [] }];
    });
  }, []);

  const handleRemoveSlot = useCallback(() => {
    setSlots(prev => {
      if (prev.length <= 1) return prev;
      const newSlots = [...prev];
      const removedSlot = newSlots.pop();
      // If the removed slot was active, switch to the last available slot
      if (removedSlot && removedSlot.id === activeSlotId) {
        setActiveSlotId(newSlots[newSlots.length - 1].id);
      }
      return newSlots;
    });
  }, [activeSlotId]);

  const handleRegisterSale = async () => {
    // Only register the ACTIVE slot
    if (activeSlot.items.length === 0) return;

    setIsRegistering(true);

    try {
      let pacienteIdToUse = activeSlot.pacienteId;
      if (!pacienteIdToUse && currentSliderPacienteId) {
        pacienteIdToUse = currentSliderPacienteId;
      }

      await createOrder({
        patientId: pacienteIdToUse ? (pacienteIdToUse as Id<"users">) : undefined,
        items: activeSlot.items.map(item => ({
          productId: item.productId,
          cantidad: item.cantidad,
        })),
      });

      // Clear ONLY the active slot, leave others untouched
      setSlots(prev => prev.map(slot => {
        if (slot.id === activeSlotId) {
          return { ...slot, items: [], pacienteId: null };
        }
        return slot;
      }));

      // Increment local counter optimistically
      setLocalSalesOffset(prev => prev + 1);

      console.log(`Venta registrada para slot ${activeSlotId} (optimistic)`);
    } catch (error) {
      console.error('Error al registrar venta:', error);
      alert('Error al registrar venta. Intente de nuevo.');
    } finally {
      setIsRegistering(false);
    }
  };

  // --- Loading state ---
  if (products === undefined) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Cargando productos...</p>
        </div>
      </div>
    );
  }

  // --- Render ---
  return (
    <div className="h-full bg-gray-100 flex flex-col overflow-hidden">
      {/* Top bar with sync status */}
      <div className="shrink-0 relative flex items-center justify-center px-3 pt-2 pb-1">
        <h1 className="text-lg font-bold text-gray-900">POS Cafetin</h1>
        <div className="absolute right-3">
          <SyncStatus />
        </div>
      </div>

      {/* Slot selector - improved compact design */}
      <div className="shrink-0 px-3 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          {slots.map((slot) => (
            <SlotButton
              key={slot.id}
              slotNumber={slot.id}
              isActive={slot.id === activeSlotId}
              itemCount={slot.items.reduce((sum, item) => sum + item.cantidad, 0)}
              onClick={() => handleSlotClick(slot.id)}
              showRipple={ghostAddFeedback[slot.id] || false}
              onCoffeeClick={() => handleGhostAddCoffeeForSlot(slot.id)}
              showCoffeeFeedback={ghostAddFeedback[slot.id] || false}
              disabledCoffee={!coffeeProductId}
            />
          ))}
          <div className="flex flex-col gap-1 ml-2 shrink-0">
            <button
              onClick={handleAddSlot}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors shadow-sm"
              title="Agregar orden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {slots.length > 1 && (
              <button
                onClick={handleRemoveSlot}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm"
                title="Quitar última orden"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-20">
        {/* Search bar */}
        <div className="sticky top-0 bg-gray-100 pt-1 pb-2 z-10">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-gray-600"
              >
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`
              shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150
              ${activeCategory === null
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }
            `}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`
                shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-150
                ${activeCategory === cat
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product grid - 2 cols mobile, 4 cols desktop */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm">
              {searchQuery ? 'No se encontraron productos' : 'No hay productos disponibles'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product._id}
                name={product.name}
                unit={product.baseUnit}
                onAdd={() => handleAddProduct(product)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom cart bar */}
      <CartBottomBar
        itemCount={activeSlotItemCount}
        orderNumber={posSalesCount + 1}
        onViewTicket={() => setTicketOpen(true)}
      />

      {/* Ticket slide-up panel */}
      <TicketPanel
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        slot={activeSlot}
        orderNumber={posSalesCount + 1}
        pacientes={pacientes}
        activeSlotPacienteId={activeSlot.pacienteId || currentSliderPacienteId}
        onPacienteChange={handlePacienteChange}
        onDecreaseQuantity={handleDecreaseQuantity}
        onRemoveItem={handleRemoveItem}
        onIncreaseQuantity={handleIncreaseQuantity}
        onRegisterSale={handleRegisterSale}
        isRegistering={isRegistering}
      />
    </div>
  );
}
