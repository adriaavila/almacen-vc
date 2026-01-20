import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-center';
  
  const variantClasses = {
    primary: 'bg-emerald-500 hover:bg-emerald-600 text-white px-6',
    secondary: 'bg-teal-500 hover:bg-teal-600 text-white px-6',
    destructive: 'bg-red-500 hover:bg-red-600 text-white px-6',
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
