import { useInventoryStore } from '@/stores/inventoryStore';
import { useEffect, useState } from 'react';

export function SyncStatus() {
    const isSyncing = useInventoryStore((state) => state.pendingActions.length > 0);
    const lastSyncedAt = useInventoryStore((state) => state.products.length > 0 ? state.products[0].lastSyncedAt : undefined);
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        // Initial check
        setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!isOnline) {
        return (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Offline
            </div>
        );
    }

    if (isSyncing) {
        return (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100">
                <svg className="animate-spin h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sincronizando...
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100 opacity-75 hover:opacity-100 transition-opacity">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Sincronizado
        </div>
    );
}
