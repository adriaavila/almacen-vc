import React from 'react';

interface BadgeProps {
  variant: 'pendiente' | 'entregado' | 'bajo-minimo' | 'ok';
  children: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  const baseClasses = `
    px-2.5 py-1 rounded-full text-xs font-semibold
    transition-all duration-200
    inline-flex items-center justify-center
  `.trim().replace(/\s+/g, ' ');
  
  const variantClasses = {
    pendiente: 'bg-amber-100 text-amber-800 border border-amber-200',
    entregado: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    'bajo-minimo': 'bg-red-100 text-red-800 border border-red-200',
    ok: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
