'use client';

import { useState, useMemo, useEffect } from 'react';
import { api } from 'convex/_generated/api';
import { useAction } from 'convex/react';
import { Id } from 'convex/_generated/dataModel';
import { useOfflineMutation } from '@/lib/hooks/useOfflineMutation';
import { RequesterHeader } from '@/components/requester/RequesterHeader';
import { Button } from '@/components/ui/Button';
import { SlotButton } from '@/components/ui/SlotButton';
import { PatientSlider } from '@/components/ui/PatientSlider';
import { OrderSummaryPanel } from '@/components/ui/OrderSummaryPanel';
import { normalizeSearchText } from '@/lib/utils';
import { useInventoryData } from '@/lib/hooks/useInventoryData';
import { useUsersData } from '@/lib/hooks/useUsersData';
import { Slot, Paciente } from '@/types';

// Mock legacy removed, using database users


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
  // Obtener datos híbridos (Convex o cache) - also syncs to Zustand store
  const products = useInventoryData();
  // Use offline-aware mutations for orders
  const createOrder = useOfflineMutation('createOrder');
  const deliverOrder = useOfflineMutation('deliverOrder');
  // Use offline-aware users data
  const users = useUsersData();

  // Map users to UI Paciente type
  const pacientes = useMemo(() => {
    return users?.map(u => ({ id: u._id, nombre: u.nombre, estado: u.estado })) || [];
  }, [users]);

  // State
  // Lazy state initialization for slots
  const [slots, setSlots] = useState<Slot[]>(() => INITIAL_SLOTS);
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
      setCurrentSliderPacienteId(pacientes[0]?.id || null);
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

  // Handle add product to active slot - uses functional setState for stable callback
  const handleAddProductToActiveSlot = (product: ConvexProduct) => {
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
  const [currentSliderPacienteId, setCurrentSliderPacienteId] = useState<string | null>(null);

  // Update default selected patient when users load
  useEffect(() => {
    if (pacientes.length > 0 && !currentSliderPacienteId) {
      setCurrentSliderPacienteId(pacientes[0].id);
    }
  }, [pacientes, currentSliderPacienteId]);

  // Handle register sale (batch save)
  const handleRegisterSale = async () => {
    const slotsWithItems = slots.filter(s => s.items.length > 0);

    if (slotsWithItems.length === 0) {
      alert('No hay ventas para registrar');
      return;
    }

    setIsRegistering(true);

    try {
      // Results can be either order IDs (online) or queued responses (offline)
      const orderResults: Array<Id<"orders"> | { actionId: string; queued: true }> = [];

      // Create orders for all slots with items
      // Note: orders.create expects itemId, but we're using productId
      // This may need backend update to support products
      for (const slot of slotsWithItems) {
        // If slot is active and has no paciente but slider shows one, assign it
        let pacienteIdToUse = slot.pacienteId;
        if (slot.id === activeSlotId && !pacienteIdToUse && currentSliderPacienteId) {
          pacienteIdToUse = currentSliderPacienteId;
        }

        const result = await createOrder({
          area: 'Cafetin',
          patientId: pacienteIdToUse ? (pacienteIdToUse as Id<"users">) : undefined,
          items: slot.items.map(item => ({
            productId: item.productId,
            cantidad: item.cantidad,
          })),
          type: 'pos',
        });
        orderResults.push(result);
      }

      // Check if any order was queued (offline mode)
      const wasQueued = orderResults.some(result => typeof result === 'object' && 'queued' in result && result.queued);

      // Deliver all orders immediately (POS sales are instant, stock must be updated)
      // Skip delivery if we're offline (orders will be delivered when synced)
      if (!wasQueued) {
        for (const result of orderResults) {
          // Only deliver if we have a real order ID (not a queued response)
          if (typeof result === 'string' || !('queued' in result)) {
            await deliverOrder({ id: result as Id<"orders"> });
          }
        }
      }

      // Clear processed slots
      setSlots(prev => prev.map(slot => {
        if (slot.items.length > 0) {
          return { ...slot, items: [], pacienteId: null };
        }
        return slot;
      }));

      // Show appropriate message based on online/offline status
      if (wasQueued) {
        alert(`Ventas guardadas (se sincronizarán cuando vuelva la conexión): ${slotsWithItems.length} ${slotsWithItems.length === 1 ? 'venta' : 'ventas'}`);
      } else {
        alert(`Ventas registradas exitosamente: ${slotsWithItems.length} ${slotsWithItems.length === 1 ? 'venta' : 'ventas'}`);
      }
    } catch (error) {
      console.error('Error al registrar ventas:', error);
      alert('Error al registrar ventas. Intente de nuevo.');
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle daily close trigger
  const triggerDailySend = useAction(api.billing.triggerDailySend);
  const [isSendingDaily, setIsSendingDaily] = useState(false);

  const handleDailyClose = async () => {
    if (!confirm("¿Estás seguro de cerrar el día? Esto enviará el reporte diario a n8n.")) {
      return;
    }

    setIsSendingDaily(true);
    try {
      const result = await triggerDailySend();
      if (result.success) {
        alert(result.message || "Reporte enviado exitosamente");
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      console.error("Error sending daily report:", error);
      alert("Error al enviar el reporte diario");
    } finally {
      setIsSendingDaily(false);
    }
  };

  if (products === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 text-gray-500">
            <p>Cargando productos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden w-full px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 space-y-1 sm:space-y-1.5 md:space-y-2">
        <div className="flex justify-between items-start mb-1 pb-1 sm:mb-1 sm:pb-1 md:mb-1 md:pb-1 lg:mb-1 lg:pb-1">
          <RequesterHeader
            title="POS"
            subtitle="Cafetin - Venta al público"
            className="!mb-0 !pb-0"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDailyClose}
            disabled={isSendingDaily}
            className="text-xs px-2 py-1 h-8"
          >
            {isSendingDaily ? "Enviando..." : "Cerrar día"}
          </Button>
        </div>

        {/* Zona A: Panel de Control Multitarea */}
        <div className="shrink-0">
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-1 sm:p-1.5 md:p-2">
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
        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
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
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 sm:mb-1.5 shrink-0 sticky top-0 bg-white z-10">
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
            pacientes={pacientes}
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
      </div>
    </div>
  );
}
