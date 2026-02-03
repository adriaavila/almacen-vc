'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type { CreateProductModal as CreateType } from './CreateProductModal';
import type { EditProductModal as EditType } from './EditProductModal';

// Lazy-load heavy modals for better initial bundle size
export const LazyCreateProductModal = dynamic(
    () => import('./CreateProductModal').then(m => ({ default: m.CreateProductModal })),
    { ssr: false }
) as typeof CreateType;

export const LazyEditProductModal = dynamic(
    () => import('./EditProductModal').then(m => ({ default: m.EditProductModal })),
    { ssr: false }
) as typeof EditType;

// Re-export types for convenience
export type LazyCreateProductModalProps = ComponentProps<typeof CreateType>;
export type LazyEditProductModalProps = ComponentProps<typeof EditType>;
