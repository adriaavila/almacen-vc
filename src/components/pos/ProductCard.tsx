'use client';

import { useState } from 'react';

interface ProductCardProps {
    name: string;
    unit: string;
    stock: number;
    onAdd: () => void;
}

export function ProductCard({ name, unit, stock, onAdd }: ProductCardProps) {
    const [pressed, setPressed] = useState(false);
    const isOutOfStock = stock <= 0;

    const handleClick = () => {
        if (isOutOfStock) return;
        setPressed(true);
        onAdd();
        setTimeout(() => setPressed(false), 150);
    };

    const getNameSizeClass = (length: number) => {
        if (length > 40) return 'text-[10px] leading-3';
        if (length > 25) return 'text-xs leading-4';
        return 'text-sm leading-tight';
    };

    return (
        <div
            className={`
        relative bg-white rounded-xl border border-gray-200 p-3 flex flex-col justify-between
        shadow-sm hover:shadow-md transition-all duration-200
        min-h-[120px]
        ${pressed ? 'scale-[0.97] shadow-inner' : ''}
        ${isOutOfStock ? 'opacity-60 grayscale-[0.5] cursor-not-allowed' : ''}
      `}
        >
            {/* Product name */}
            <div className="flex-1">
                <h3 className={`font-semibold text-gray-900 ${getNameSizeClass(name.length)}`}>
                    {name}
                </h3>
            </div>

            {/* Bottom row: unit badge + add button */}
            <div className="flex items-end justify-between mt-2">
                <div className="flex flex-col gap-1">
                    <span className="inline-block bg-gray-100 text-gray-500 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded w-fit">
                        {unit}
                    </span>
                    {isOutOfStock && (
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-tight">
                            Sin stock
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleClick}
                    disabled={isOutOfStock}
                    className={`
            w-9 h-9 rounded-full transition-all duration-150
            flex items-center justify-center shadow-sm
            touch-target
            ${isOutOfStock
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-90'}
          `}
                    aria-label={isOutOfStock ? `${name} sin stock` : `Agregar ${name}`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
