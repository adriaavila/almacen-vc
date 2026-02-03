'use client';

import { useConnectionStatus } from '@/lib/hooks/useOnlineStatus';
import { WifiOff, RefreshCw, Check } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Banner that shows connection status:
 * - Red: Offline
 * - Yellow: Syncing pending actions
 * - Green: Just synced (briefly)
 */
export function OfflineBanner() {
    const { isOnline, pendingCount, hasPending } = useConnectionStatus();
    const [justSynced, setJustSynced] = useState(false);
    const [prevPending, setPrevPending] = useState(0);

    // Detect when sync completes
    useEffect(() => {
        if (prevPending > 0 && pendingCount === 0 && isOnline) {
            setJustSynced(true);
            const timer = setTimeout(() => setJustSynced(false), 2000);
            return () => clearTimeout(timer);
        }
        setPrevPending(pendingCount);
    }, [pendingCount, isOnline, prevPending]);

    // Don't show if online and no pending and not just synced
    if (isOnline && !hasPending && !justSynced) {
        return null;
    }

    // Determine banner state
    let bgColor = '';
    let textColor = '';
    let icon = null;
    let message = '';

    if (!isOnline) {
        bgColor = 'bg-red-500';
        textColor = 'text-white';
        icon = <WifiOff className="w-4 h-4" />;
        message = hasPending
            ? `Sin conexión • ${pendingCount} acción${pendingCount > 1 ? 'es' : ''} pendiente${pendingCount > 1 ? 's' : ''}`
            : 'Sin conexión • Trabajando en modo offline';
    } else if (hasPending) {
        bgColor = 'bg-amber-500';
        textColor = 'text-white';
        icon = <RefreshCw className="w-4 h-4 animate-spin" />;
        message = `Sincronizando ${pendingCount} acción${pendingCount > 1 ? 'es' : ''}...`;
    } else if (justSynced) {
        bgColor = 'bg-emerald-500';
        textColor = 'text-white';
        icon = <Check className="w-4 h-4" />;
        message = 'Sincronizado correctamente';
    }

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-50 ${bgColor} ${textColor} py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium shadow-md transition-all duration-300`}
            role="status"
            aria-live="polite"
        >
            {icon}
            <span>{message}</span>
        </div>
    );
}
