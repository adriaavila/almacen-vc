'use client';

import React from 'react';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminHeader({ title, subtitle, actions }: AdminHeaderProps) {
  return (
    <div className="mb-1 sm:mb-2 md:mb-4 lg:mb-6 pb-1 sm:pb-2 md:pb-3 lg:pb-4 border-b border-gray-200">
      <div className="flex items-start justify-between gap-2 sm:gap-3 md:gap-4">
        {actions && (
          <div className="flex items-center gap-1 sm:gap-2">
            {actions}
          </div>
        )}
        <div className="flex-1 text-center">
          <h1 className="text-sm sm:text-base md:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-500 mt-0.5 sm:mt-1 md:mt-1.5 hidden sm:block">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-1 sm:gap-2 w-[100px]">
            {/* Spacer to balance the left actions */}
          </div>
        )}
      </div>
    </div>
  );
}
