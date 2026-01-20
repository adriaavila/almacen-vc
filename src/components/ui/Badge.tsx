import React from 'react';

interface BadgeProps {
  variant: 'pendiente' | 'entregado' | 'bajo-minimo' | 'ok';
  children: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
  
  const variantClasses = {
    pendiente: 'bg-amber-100 text-amber-800',
    entregado: 'bg-emerald-100 text-emerald-800',
    'bajo-minimo': 'bg-red-100 text-red-800',
    ok: 'bg-emerald-100 text-emerald-800',
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
