'use client';

interface CartBottomBarProps {
    itemCount: number;
    orderNumber: number;
    onViewTicket: () => void;
}

export function CartBottomBar({ itemCount, orderNumber, onViewTicket }: CartBottomBarProps) {
    if (itemCount === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 lg:ml-64">
            <button
                type="button"
                onClick={onViewTicket}
                className="
          w-full flex items-center justify-between
          bg-gray-900 text-white rounded-2xl
          px-4 py-3.5 shadow-2xl
          active:scale-[0.98] transition-transform duration-150
          animate-slide-up
        "
            >
                {/* Item count badge */}
                <span className="inline-flex items-center bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>

                {/* Order label */}
                <span className="text-sm font-medium text-gray-300">
                    Orden #{orderNumber}
                </span>

                {/* CTA */}
                <span className="text-sm font-semibold text-white flex items-center gap-1">
                    Ver Ticket
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </span>
            </button>
        </div>
    );
}
