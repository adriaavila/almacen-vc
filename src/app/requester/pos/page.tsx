'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { PageContainer } from '@/components/layout/PageContainer';
import { RequesterHeader } from '@/components/requester/RequesterHeader';
import { Button } from '@/components/ui/Button';
import { SlotButton } from '@/components/ui/SlotButton';
import { PatientSlider } from '@/components/ui/PatientSlider';
import { OrderSummaryPanel } from '@/components/ui/OrderSummaryPanel';
import { normalizeSearchText } from '@/lib/utils';
import { useInventorySync } from '@/lib/hooks/useInventorySync';
import { useInventoryData } from '@/lib/hooks/useInventoryData';
import { Slot, Paciente } from '@/types';

// Mock pacientes data (will be replaced with Convex query in future)
const mockPacientes: Paciente[] = [
  { id: '1', nombre: 'Juan Pérez' },
  { id: '2', nombre: 'María García' },
  { id: '3', nombre: 'Carlos López' },
  { id: '4', nombre: 'Ana Martínez' },
  { id: '5', nombre: 'Pedro Rodríguez' },
  { id: '6', nombre: 'Laura Sánchez' },
  { id: '7', nombre: 'Miguel Torres' },
];

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
  // Sincronizar datos de Convex al store de Zustand
  useInventorySync();
  
  // Obtener datos híbridos (Convex o cache)
  const products = useInventoryData();
  const createOrder = useMutation(api.orders.create);
  const deliverOrder = useMutation(api.orders.deliver);

  // State
  const [slots, setSlots] = useState<Slot[]>(INITIAL_SLOTS);
  const [activeSlotId, setActiveSlotId] = useState<number>(1);
  const [coffeeProductId, setCoffeeProductId] = useState<Id<"products"> | null>(null);
  const [ghostAddFeedback, setGhostAddFeedback] = useState<Record<number, boolean>>({});
  const [isRegistering, setIsRegistering] = useState(false);

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

  // Get active slot
  const activeSlot = useMemo(() => {
    return slots.find(s => s.id === activeSlotId) || slots[0];
  }, [slots, activeSlotId]);

  // Filter products (only active, cafetin stock, available for sale)
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.filter(product => 
      product.active && 
      product.stockCafetin > 0 && 
      product.availableForSale !== false
    );
  }, [products]);

  // Group products by subCategory for column layout (scroll horizontal = columns, scroll vertical = per column)
  const productsBySubCategory = useMemo(() => {
    const groups: Record<string, ConvexProduct[]> = {};
    for (const product of filteredProducts) {
      const key = product.subCategory?.trim() || 'Otros';
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    }
    const keys = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    const result: { subCategory: string; products: ConvexProduct[] }[] = [];
    for (const key of keys) {
      result.push({ subCategory: key, products: groups[key]! });
    }
    return result;
  }, [filteredProducts]);

  // Handle slot activation
  const handleSlotClick = (slotId: number) => {
    setActiveSlotId(slotId);
    // Sync slider paciente with active slot's paciente
    const newActiveSlot = slots.find(s => s.id === slotId);
    if (newActiveSlot?.pacienteId) {
      setCurrentSliderPacienteId(newActiveSlot.pacienteId);
    } else {
      // If no paciente assigned, show first paciente but don't assign yet
      setCurrentSliderPacienteId(mockPacientes[0]?.id || null);
    }
  };

  // Add coffee to a specific slot (each slot has its own coffee button)
  const handleGhostAddCoffeeForSlot = (slotId: number) => {
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
  };

  // Handle add product to active slot
  const handleAddProductToActiveSlot = (product: ConvexProduct) => {
    const existingItem = activeSlot.items.find(c => c.productId === product._id);
    
    setSlots(prev => prev.map(slot => {
      if (slot.id === activeSlotId) {
        if (existingItem) {
          return {
            ...slot,
            items: slot.items.map(c =>
              c.productId === product._id
                ? { ...c, cantidad: c.cantidad + 1 }
                : c
            ),
          };
        } else {
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
      }
      return slot;
    }));
  };

  // Handle decrease quantity (subtract 1, remove if reaches 0)
  const handleDecreaseQuantity = (productId: Id<"products">) => {
    setSlots(prev => prev.map(slot => {
      if (slot.id === activeSlotId) {
        return {
          ...slot,
          items: slot.items.map(item =>
            item.productId === productId
              ? { ...item, cantidad: Math.max(0, item.cantidad - 1) }
              : item
          ).filter(item => item.cantidad > 0) // Remove if cantidad reaches 0
        };
      }
      return slot;
    }));
  };

  // Handle remove item completely
  const handleRemoveItem = (productId: Id<"products">) => {
    setSlots(prev => prev.map(slot => {
      if (slot.id === activeSlotId) {
        return {
          ...slot,
          items: slot.items.filter(item => item.productId !== productId)
        };
      }
      return slot;
    }));
  };

  // Handle paciente change from slider
  const handlePacienteChange = (pacienteId: string) => {
    setCurrentSliderPacienteId(pacienteId);
    setSlots(prev => prev.map(slot =>
      slot.id === activeSlotId
        ? { ...slot, pacienteId }
        : slot
    ));
  };

  // Get current paciente from slider (for active slot if not assigned)
  const [currentSliderPacienteId, setCurrentSliderPacienteId] = useState<string | null>(
    mockPacientes[0]?.id || null
  );

  // Handle register sale (batch save)
  const handleRegisterSale = async () => {
    const slotsWithItems = slots.filter(s => s.items.length > 0);

    if (slotsWithItems.length === 0) {
      alert('No hay ventas para registrar');
      return;
    }

    setIsRegistering(true);

    try {
      const orderIds: Id<"orders">[] = [];

      // Create orders for all slots with items
      // Note: orders.create expects itemId, but we're using productId
      // This may need backend update to support products
      for (const slot of slotsWithItems) {
        // If slot is active and has no paciente but slider shows one, assign it
        let pacienteIdToUse = slot.pacienteId;
        if (slot.id === activeSlotId && !pacienteIdToUse && currentSliderPacienteId) {
          pacienteIdToUse = currentSliderPacienteId;
        }

        const orderId = await createOrder({
          area: 'Cafetín',
          items: slot.items.map(item => ({
            productId: item.productId,
            cantidad: item.cantidad,
          })),
        });
        orderIds.push(orderId);
      }

      // Deliver all orders immediately (POS sales are instant, stock must be updated)
      for (const orderId of orderIds) {
        await deliverOrder({ id: orderId });
      }

      // Clear processed slots
      setSlots(prev => prev.map(slot => {
        if (slot.items.length > 0) {
          return { ...slot, items: [], pacienteId: null };
        }
        return slot;
      }));

      alert(`Ventas registradas exitosamente: ${slotsWithItems.length} ${slotsWithItems.length === 1 ? 'venta' : 'ventas'}`);
    } catch (error) {
      console.error('Error al registrar ventas:', error);
      alert('Error al registrar ventas. Intente de nuevo.');
    } finally {
      setIsRegistering(false);
    }
  };

  if (products === undefined) {
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
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <PageContainer className="flex-1 flex flex-col overflow-hidden max-w-full space-y-1! sm:space-y-1.5! md:space-y-2! py-1.5! sm:py-2! md:py-2.5!">
        <RequesterHeader 
          title="Punto de Venta"
          subtitle="Cafetín - Venta al público"
        />

        {/* Zona A: Panel de Control Multitarea */}
        <div className="shrink-0">
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-1.5 sm:p-2 md:p-2.5">
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-5">
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
            </div>
          </div>
        </div>

        {/* Zona B: Productos por subcategoría — scroll horizontal (columnas), scroll vertical (por columna) */}
        <div className="flex-1 overflow-hidden min-h-0">
          <div className="bg-white rounded-md shadow-sm border border-gray-200 px-1 sm:px-1.5 md:px-2 pt-0.5 pb-0.5 sm:pt-0.5 sm:pb-0.5 h-full flex flex-col">
            <h2 className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 mb-0.5 sm:mb-1 px-1 text-center shrink-0">Productos</h2>
            
            {productsBySubCategory.length === 0 ? (
              <div className="text-center py-8 text-gray-500 flex-1 flex items-center justify-center">
                <p className="text-sm md:text-base">No hay productos disponibles</p>
              </div>
            ) : (
              <div
                className="flex gap-2 sm:gap-3 md:gap-4 overflow-x-auto flex-1 min-h-0 scrollbar-hide"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {productsBySubCategory.map(({ subCategory, products: categoryProducts }) => (
                  <div
                    key={subCategory}
                    className="shrink-0 flex flex-col w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] min-h-0"
                  >
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 sm:mb-1.5 shrink-0">
                      {subCategory}
                    </h3>
                    <div className="flex-1 overflow-y-auto min-h-0 space-y-1 sm:space-y-1.5 pr-0.5">
                      {categoryProducts.map((product) => (
                        <button
                          key={product._id}
                          type="button"
                          onClick={() => handleAddProductToActiveSlot(product)}
                          className="w-full p-2 sm:p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 active:bg-gray-600 transition-colors text-left flex flex-col gap-0.5 shadow-sm min-h-[44px]"
                          aria-label={`Agregar ${product.name}`}
                        >
                          <span className="font-semibold text-white text-[10px] sm:text-xs leading-tight line-clamp-2">
                            {product.name}
                          </span>
                          <span className="text-gray-400 text-[9px] sm:text-[10px]">
                            —
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Zona C: Cliente / Paciente (pills) */}
        <div className="shrink-0">
          <PatientSlider
            pacientes={mockPacientes}
            activeSlotPacienteId={activeSlot.pacienteId || currentSliderPacienteId}
            onPacienteChange={handlePacienteChange}
          />
        </div>

        {/* Barra inferior: productos seleccionados a la izquierda, botón Registrar pegado al fondo */}
        <div className="shrink-0 flex items-stretch gap-2 sm:gap-3 border-t border-gray-200 bg-white py-1.5 sm:py-2 px-2 sm:px-3">
          <div className="flex-1 min-w-0 overflow-y-auto max-h-20 sm:max-h-24 md:max-h-28 flex flex-col">
            <OrderSummaryPanel
              slot={activeSlot}
              onDecreaseQuantity={handleDecreaseQuantity}
              onRemoveItem={handleRemoveItem}
            />
          </div>
          <Button
            variant="primary"
            className="shrink-0 py-2 sm:py-2.5 md:py-3 px-4 sm:px-5 md:px-6 text-sm sm:text-base font-bold rounded-none"
            onClick={handleRegisterSale}
            disabled={isRegistering || slots.every(s => s.items.length === 0)}
          >
            {isRegistering ? 'Registrando...' : 'Registrar'}
          </Button>
        </div>
      </PageContainer>
    </div>
  );
}
