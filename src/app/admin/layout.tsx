'use client';

import { useState, useEffect } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  // Detect screen size and set initial state
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // On desktop, force sidebar open
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        // On mobile, keep current state or close
        setSidebarOpen(prev => prev);
      }
    };

    // Set initial state
    if (typeof window !== 'undefined') {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      }
    }

    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleClose = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleOpen = () => {
    if (isMobile) {
      setSidebarOpen(true);
    }
  };

  // Sidebar is open if: explicitly open OR on desktop
  const isSidebarOpen = sidebarOpen || !isMobile;

  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar isOpen={isSidebarOpen} onClose={handleClose} />
        <main className="flex-1 lg:ml-64 w-full">
          {/* Mobile menu button - only shown when sidebar is closed */}
          {isMobile && !sidebarOpen && (
            <button
              onClick={handleOpen}
              className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-md shadow-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              aria-label="Abrir menú"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          )}
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
