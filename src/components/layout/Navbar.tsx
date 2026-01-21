'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();
  
  const isRequester = pathname?.startsWith('/requester');
  const isAdmin = pathname?.startsWith('/admin');
  const isOwner = pathname?.startsWith('/owner');
  const isMantenimientoBasico = pathname?.startsWith('/mantenimiento') && !pathname?.startsWith('/admin');
  
  // Hide navbar completely on admin and owner routes (they have their own layouts)
  if (isAdmin || isOwner) {
    return null;
  }
  
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4 md:space-x-6">
            {!isMantenimientoBasico && (
              <Link href="/" className="flex items-center flex-shrink-0">
                <Image
                  src="/logo-vistacampo.png"
                  alt="Vistacampo Centro Terapéutico"
                  width={180}
                  height={60}
                  className="h-10 md:h-12 w-auto"
                  priority
                />
              </Link>
            )}
            
            {isMantenimientoBasico && (
              <>
                <Link
                  href="/mantenimiento/repuestos"
                  className={`px-2 md:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                    pathname?.startsWith('/mantenimiento/repuestos')
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Repuestos
                </Link>
                <Link
                  href="/mantenimiento/activos"
                  className={`px-2 md:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                    pathname?.startsWith('/mantenimiento/activos')
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Activos
                </Link>
                <Link
                  href="/mantenimiento/trabajos"
                  className={`px-2 md:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                    pathname?.startsWith('/mantenimiento/trabajos')
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Trabajos
                </Link>
              </>
            )}
            
            {isRequester && (
              <>
                <Link
                  href="/requester/pedido"
                  className={`px-2 md:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                    pathname === '/requester/pedido'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Crear Pedido
                </Link>
                <Link
                  href="/requester/mis-pedidos"
                  className={`px-2 md:px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                    pathname === '/requester/mis-pedidos'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Mis Pedidos
                </Link>
              </>
            )}
            
          </div>
          
          {!isRequester && (
            <div className="flex items-center">
              <Link
                href="/"
                className="p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Volver a inicio"
              >
                <svg
                  className="h-5 w-5"
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
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
