import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  children: React.ReactNode;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  loading = false,
  ...props
}: ButtonProps & { size?: 'sm' | 'md' | 'lg' | 'icon' }) {
  const baseClasses = `
    rounded-md font-medium
    flex items-center justify-center text-center
    transition-all duration-200 ease-in-out
    disabled:opacity-50 disabled:cursor-not-allowed
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2
    active:scale-[0.98]
    cursor-pointer
  `.trim().replace(/\s+/g, ' ');

  const sizeClasses = {
    sm: 'h-8 px-3 text-sm min-w-[32px]',
    md: 'h-11 px-6 text-base min-w-[44px]',
    lg: 'h-12 px-8 text-lg min-w-[48px]',
    icon: 'h-10 w-10 p-0',
  };

  const variantClasses = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md',
    secondary: 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow-md',
    destructive: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
