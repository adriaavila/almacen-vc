'use client';

import { useState, useEffect } from 'react';
import { RequesterSidebar } from '@/components/requester/RequesterSidebar';
import { Navbar } from '@/components/layout/Navbar';
import { getUserArea } from '@/lib/auth';

export default function RequesterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [userArea, setUserArea] = useState<string | null>(null);
  const [isCafetin, setIsCafetin] = useState(false);

  // Check if user area is Cafetin
  useEffect(() => {
    const checkArea = () => {
      const area = getUserArea();
      setUserArea(area);
      setIsCafetin(area === 'Cafetin');
    };

    // Initial check
    checkArea();

    // Listen for area changes
    const handleAreaChange = () => {
      checkArea();
    };

    window.addEventListener('userAreaChange', handleAreaChange);
    window.addEventListener('storage', handleAreaChange);

    return () => {
      window.removeEventListener('userAreaChange', handleAreaChange);
      window.removeEventListener('storage', handleAreaChange);
    };
  }, []);

  // Detect screen size and set initial state
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // On desktop, force sidebar open (only if Cafetin)
      if (!mobile && isCafetin) {
        setSidebarOpen(true);
      }
    };

    // Set initial state
    if (typeof window !== 'undefined') {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile && isCafetin) {
        setSidebarOpen(true);
      }
    }

    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [isCafetin]);

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

  // Sidebar is open if: explicitly open OR on desktop (and is Cafetin)
  const isSidebarOpen = (sidebarOpen || !isMobile) && isCafetin;

  // If Cafetin, show sidebar layout; otherwise show navbar layout
  if (isCafetin) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <RequesterSidebar isOpen={isSidebarOpen} onClose={handleClose} />
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
    );
  }

  // For non-Cafetin areas, show navbar layout
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {children}
    </div>
  );
}
