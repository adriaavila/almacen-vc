'use client';

import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'destructive';
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  className = '',
}: EmptyStateProps) {
  const defaultIcon = (
    <svg
      className="w-16 h-16 text-gray-400 mx-auto"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center ${className}`}>
      <div className="flex flex-col items-center justify-center">
        {icon || defaultIcon}
        <h3 className="mt-4 text-lg font-semibold text-gray-900 text-center">{title}</h3>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">{message}</p>
        {action && (
          <div className="mt-6">
            <Button
              variant={action.variant || 'primary'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Pre-configured empty states for common use cases
export function EmptyProductsState({ onAddProduct }: { onAddProduct?: () => void }) {
  return (
    <EmptyState
      title="No hay productos"
      message="No se encontraron productos. Agrega productos para comenzar."
      action={onAddProduct ? {
        label: 'Agregar producto',
        onClick: onAddProduct,
        variant: 'primary',
      } : undefined}
    />
  );
}

export function EmptyOrdersState({ message }: { message?: string }) {
  return (
    <EmptyState
      title="No hay pedidos"
      message={message || "No se encontraron pedidos pendientes."}
    />
  );
}

export function EmptySearchResultsState({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      title="No se encontraron resultados"
      message="Intenta ajustar tus filtros de búsqueda para encontrar lo que buscas."
      action={onClearFilters ? {
        label: 'Limpiar filtros',
        onClick: onClearFilters,
        variant: 'secondary',
      } : undefined}
    />
  );
}