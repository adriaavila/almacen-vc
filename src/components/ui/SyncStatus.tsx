import { useInventoryStore } from '@/stores/inventoryStore';
import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

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
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 shadow-sm border border-amber-200" title="Offline">
                <WifiOff className="w-4 h-4" />
            </div>
        );
    }

    if (isSyncing) {
        return (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 shadow-sm border border-blue-100" title="Sincronizando...">
                <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100 opacity-75 hover:opacity-100 transition-opacity" title="Sincronizado">
            <Wifi className="w-4 h-4" />
        </div>
    );
}
