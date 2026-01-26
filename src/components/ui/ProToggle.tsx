'use client';

import { useRouter } from 'next/navigation';

interface ProToggleProps {
  isProMode?: boolean;
  className?: string;
}

export function ProToggle({ isProMode = false, className = '' }: ProToggleProps) {
  const router = useRouter();

  const handleToggle = () => {
    if (isProMode) {
      router.push('/admin/dashboard');
    } else {
      router.push('/owner');
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`
        px-4 py-2 rounded-md font-medium text-sm
        transition-all duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2
        active:scale-[0.98]
        ${
          isProMode
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300'
        }
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      aria-label={isProMode ? 'Ver dashboard normal' : 'Ver vista PRO'}
    >
      PRO
    </button>
  );
}
