'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/30">
      {/* Modern Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/owner" className="flex items-center space-x-3">
              <Image
                src="/logo-vistacampo.png"
                alt="Vistacampo Centro Terapéutico"
                width={180}
                height={60}
                className="h-10 w-auto"
                priority
              />
              <span className="text-lg font-semibold text-gray-800 hidden sm:inline">
                Monitoreo Ejecutivo
              </span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/admin/dashboard"
                className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition-colors"
              >
                Admin
              </Link>
              <Link
                href="/"
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                <span className="hidden sm:inline">Volver a inicio</span>
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <main className="w-full">{children}</main>
    </div>
  );
}
