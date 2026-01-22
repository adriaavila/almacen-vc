'use client';

import React from 'react';

interface RequesterHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function RequesterHeader({ title, subtitle, actions }: RequesterHeaderProps) {
  return (
    <div className="mb-6 pb-4 border-b border-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1.5">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
