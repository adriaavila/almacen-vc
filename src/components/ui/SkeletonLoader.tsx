'use client';

import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'list-item';
  width?: string | number;
  height?: string | number;
  className?: string;
  lines?: number; // For text variant with multiple lines
}

export function SkeletonLoader({
  variant = 'rectangular',
  width,
  height,
  className = '',
  lines = 1,
}: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const variantClasses = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
    card: 'rounded-lg',
    'list-item': 'rounded-md',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (variant === 'text' && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantClasses[variant]} ${index < lines - 1 ? 'mb-2' : ''}`}
            style={index === lines - 1 ? style : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Pre-configured skeleton components for common use cases
export function ProductListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-md shadow-sm border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <SkeletonLoader variant="text" width="60%" height={20} />
              <SkeletonLoader variant="text" width="40%" height={16} />
            </div>
            <SkeletonLoader variant="rectangular" width={100} height={40} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-md shadow-sm border-l-4 border-l-amber-500 border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <SkeletonLoader variant="text" width="30%" height={20} />
              <SkeletonLoader variant="text" width="50%" height={16} />
            </div>
            <SkeletonLoader variant="rectangular" width={120} height={40} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <SkeletonLoader
              key={colIndex}
              variant="text"
              width={colIndex === 0 ? '40%' : '20%'}
              height={24}
            />
          ))}
        </div>
      ))}
    </div>
  );
}