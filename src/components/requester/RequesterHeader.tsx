'use client';

import React from 'react';

interface RequesterHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  rightActions?: React.ReactNode;
}

export function RequesterHeader({ title, subtitle, actions, rightActions }: RequesterHeaderProps) {
  return (
    <div className="mb-1 sm:mb-2 md:mb-4 lg:mb-6 pb-1 sm:pb-2 md:pb-3 lg:pb-4 border-b border-gray-200">
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
