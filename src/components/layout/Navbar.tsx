'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();
  
  const isRequester = pathname?.startsWith('/requester');
  const isAdmin = pathname?.startsWith('/admin');
  
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo-vistacampo.png"
                alt="Vistacampo Centro Terapéutico"
                width={180}
                height={60}
                className="h-12 w-auto"
                priority
              />
            </Link>
            
            {isRequester && (
              <>
                <Link
                  href="/requester/pedido"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === '/requester/pedido'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Crear Pedido
                </Link>
                <Link
                  href="/requester/mis-pedidos"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === '/requester/mis-pedidos'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Mis Pedidos
                </Link>
              </>
            )}
            
            {isAdmin && (
              <>
                <Link
                  href="/admin/pedidos"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname?.startsWith('/admin/pedidos')
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Pedidos Pendientes
                </Link>
                <Link
                  href="/admin/inventario"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    pathname === '/admin/inventario'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Inventario
                </Link>
              </>
            )}
          </div>
          
          <div className="flex items-center">
            <Link
              href="/"
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Inicio
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
