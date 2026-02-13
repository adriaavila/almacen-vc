'use client';

import { useState } from 'react';

interface ProductCardProps {
    name: string;
    unit: string;
    onAdd: () => void;
}

export function ProductCard({ name, unit, onAdd }: ProductCardProps) {
    const [pressed, setPressed] = useState(false);

    const handleClick = () => {
        setPressed(true);
        onAdd();
        setTimeout(() => setPressed(false), 150);
    };

    return (
        <div
            className={`
        relative bg-white rounded-xl border border-gray-200 p-3 flex flex-col justify-between
        shadow-sm hover:shadow-md transition-all duration-200
        min-h-[120px]
        ${pressed ? 'scale-[0.97] shadow-inner' : ''}
      `}
        >
            {/* Product name */}
            <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                    {name}
                </h3>
            </div>

            {/* Bottom row: unit badge + add button */}
            <div className="flex items-end justify-between mt-2">
                <span className="inline-block bg-gray-100 text-gray-500 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded">
                    {unit}
                </span>
                <button
                    type="button"
                    onClick={handleClick}
                    className="
            w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700
            active:scale-90 transition-all duration-150
            flex items-center justify-center shadow-sm
            touch-target
          "
                    aria-label={`Agregar ${name}`}
                >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
