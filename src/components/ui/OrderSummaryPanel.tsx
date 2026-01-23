'use client';

import { Id } from 'convex/_generated/dataModel';
import { Slot } from '@/types';

interface OrderSummaryPanelProps {
  slot: Slot;
  onDecreaseQuantity: (itemId: Id<"items">) => void;
  onRemoveItem: (itemId: Id<"items">) => void;
}

export function OrderSummaryPanel({ slot, onDecreaseQuantity, onRemoveItem }: OrderSummaryPanelProps) {
  if (slot.items.length === 0) return null;

  return (
    <div className="mt-1 sm:mt-1.5 md:mt-2 bg-gray-50 border border-gray-200 rounded-md p-1 sm:p-1.5 md:p-2 max-h-24 sm:max-h-32 md:max-h-40 overflow-y-auto">
      <div className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-700 mb-0.5 md:mb-1">
        Slot {slot.id}:
      </div>
      <div className="space-y-0.5 md:space-y-1">
        {slot.items.map((item) => (
          <div key={item.itemId} className="flex items-center justify-between text-[10px] sm:text-xs md:text-sm">
            <span className="flex-1 truncate text-gray-900 pr-1">
              • {item.nombre} x{item.cantidad}
            </span>
            <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 ml-2 sm:ml-3 shrink-0">
              <button
                onClick={() => onDecreaseQuantity(item.itemId)}
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 active:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors p-0.5"
                aria-label={`Restar uno de ${item.nombre}`}
              >
                <span className="text-sm sm:text-base md:text-base font-medium">−</span>
              </button>
              <button
                onClick={() => onRemoveItem(item.itemId)}
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7 flex items-center justify-center rounded border border-red-300 hover:bg-red-50 active:bg-red-100 text-red-600 hover:text-red-700 transition-colors p-0.5"
                aria-label={`Eliminar ${item.nombre}`}
              >
                <span className="text-sm sm:text-base md:text-base font-medium">×</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
