'use client';

import React from 'react';

interface RequesterHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  rightActions?: React.ReactNode;
  className?: string; // Add className prop
}

export function RequesterHeader({ title, subtitle, actions, rightActions, className = '' }: RequesterHeaderProps) {
  // Use className to allow overriding defaults (mb-4 etc) or appending to them.
  // We'll keep default MB/PB unless overridden if that's desired, or just append.
  // To allow full override of margin/padding, users should pass 'mb-0 pb-0' etc.
  // But strictly appending is safer. Let's make the default spacing conditional or just easy to override with !important or assume user handles it.
  // Actually, simpler: Apply defaults ONLY if not overridden? No, typically standard is `className combined`.
  // Let's stick to appending.
  return (
    <div className={`mb-1 sm:mb-2 md:mb-4 lg:mb-6 pb-1 sm:pb-2 md:pb-3 lg:pb-4 border-b border-gray-200 ${className}`}>
      <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
        <div className="flex items-center justify-start gap-1 sm:gap-2 w-[100px]">
          {actions}
        </div>

        <div className="flex-1 text-center">
          <h1 className="text-sm sm:text-base md:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900 tracking-tight text-center">{title}</h1>
          {subtitle && (
            <p className="text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-500 mt-0.5 sm:mt-1 md:mt-1.5 hidden sm:block text-center">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-1 sm:gap-2 w-[100px]">
          {rightActions}
        </div>
      </div>
    </div>
  );
}
