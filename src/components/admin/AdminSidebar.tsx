'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mantenimientoOpen, setMantenimientoOpen] = useState(
    pathname?.startsWith('/admin/mantenimiento') || false
  );

  // Prevent body scroll when sidebar is open (only on mobile)
  useEffect(() => {
    const checkScreenSize = () => {
      const isMobileScreen = window.innerWidth < 1024;
      if (isOpen && isMobileScreen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };
    
    // Check on mount and when sidebar state changes
    checkScreenSize();
    
    // Also check on resize
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('resize', checkScreenSize);
    };
  }, [isOpen]);

  // Close sidebar when navigating (only on mobile)
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const isMobileScreen = window.innerWidth < 1024;
      if (isMobileScreen) {
        // Close after navigation completes
        const timer = setTimeout(() => {
          onClose();
        }, 200);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === '/admin/dashboard') {
      return pathname === '/admin/dashboard' || pathname === '/admin';
    }
    return pathname?.startsWith(path);
  };

  const isMantenimientoSubItemActive = (path: string) => {
    return pathname === path || pathname?.startsWith(`${path}/`);
  };

  const menuItems = [
    {
      href: '/admin/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/admin/pedidos',
      label: 'Pedidos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      href: '/admin/inventario',
      label: 'Inventario',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      href: '/admin/movements',
      label: 'Movimientos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
  ];

  const mantenimientoSubItems = [
    {
      href: '/admin/mantenimiento/activos',
      label: 'Activos',
    },
    {
      href: '/admin/mantenimiento/repuestos',
      label: 'Repuestos',
    },
    {
      href: '/admin/mantenimiento/trabajos',
      label: 'Trabajos',
    },
  ];

  return (
    <>
      {/* Overlay - only visible on mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Header with Close Button */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center" onClick={onClose}>
            <Image
              src="/logo-vistacampo.png"
              alt="Vistacampo Centro Terapéutico"
              width={180}
              height={60}
              className="h-10 w-auto"
              priority
            />
          </Link>
          {/* Close button - only visible on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Cerrar menú"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-emerald-100 text-emerald-700 border-l-4 border-emerald-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className={active ? 'text-emerald-600' : 'text-gray-500'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Mantenimiento Section - Collapsible */}
        <div className="pt-2">
          <button
            onClick={() => setMantenimientoOpen(!mantenimientoOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname?.startsWith('/admin/mantenimiento')
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            aria-expanded={mantenimientoOpen}
            aria-label="Toggle Mantenimiento menu"
          >
            <div className="flex items-center space-x-3">
              <svg
                className={`w-5 h-5 ${pathname?.startsWith('/admin/mantenimiento') ? 'text-emerald-600' : 'text-gray-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Mantenimiento</span>
            </div>
            <svg
              className={`w-4 h-4 transition-transform ${mantenimientoOpen ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Sub-items */}
          {mantenimientoOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-4">
              {mantenimientoSubItems.map((subItem) => {
                const subActive = isMantenimientoSubItemActive(subItem.href);
                return (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    onClick={onClose}
                    className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                      subActive
                        ? 'bg-emerald-100 text-emerald-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {subItem.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

        {/* Footer - Back to Home */}
        <div className="p-4 border-t border-gray-200">
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            aria-label="Volver a inicio"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Volver a inicio</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

// Button component to toggle sidebar
export function AdminSidebarToggle({ onToggle, isOpen }: { onToggle: () => void; isOpen: boolean }) {
  return (
    <button
      onClick={onToggle}
      className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-md shadow-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
      aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
      aria-expanded={isOpen}
    >
      {isOpen ? (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ) : (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      )}
    </button>
  );
}
