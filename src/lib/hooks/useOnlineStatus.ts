'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to track online/offline status with real-time updates
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Set initial state (only on client)
        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

/**
 * Hook to track both connection status and pending sync actions
 */
export function useConnectionStatus() {
    const isOnline = useOnlineStatus();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        // Import dynamically to avoid SSR issues
        const checkPendingActions = () => {
            try {
                const stored = localStorage.getItem('inventory-storage');
                if (stored) {
                    const data = JSON.parse(stored);
                    setPendingCount(data.state?.pendingActions?.length || 0);
                }
            } catch {
                setPendingCount(0);
            }
        };

        // Check initially
        checkPendingActions();

        // Check periodically
        const interval = setInterval(checkPendingActions, 2000);

        // Also check on storage changes
        window.addEventListener('storage', checkPendingActions);

        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', checkPendingActions);
        };
    }, []);

    return { isOnline, pendingCount, hasPending: pendingCount > 0 };
}
