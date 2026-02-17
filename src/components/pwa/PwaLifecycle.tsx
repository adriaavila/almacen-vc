"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export function PwaLifecycle() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            "serviceWorker" in navigator &&
            (window as any).workbox !== undefined
        ) {
            const wb = (window as any).workbox;

            // Add event listeners to handle any of PWA lifecycle event
            // https://developers.google.com/web/tools/workbox/modules/workbox-window#important_lifecycle_moments
            wb.addEventListener("waiting", (event: any) => {
                // `event.wasWaitingBeforeRegister` will be false if this is the first time the updated service worker is waiting.
                // When `event.wasWaitingBeforeRegister` is true, a previously updated service worker is still waiting.
                // You may want to customize the UI prompt accordingly.
                console.log("A new service worker is waiting to activate", event);
                setUpdateAvailable(true);
                setRegistration(event.sw.registration);
            });

            // never forget to call register as auto register is turned off in next.config.js
            wb.register();
        }
    }, []);

    const handleReload = () => {
        if (registration && registration.waiting) {
            // Send a message to the waiting service worker, instructing it to activate.
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
            // Logic to reload the page will be handled by the controlling service worker
            // or we can reload manually after a delay
            window.location.reload();
        } else {
            window.location.reload();
        }
    };

    if (!updateAvailable) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 rounded-lg bg-zinc-800 p-4 shadow-xl border border-zinc-700 w-auto animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-500/10 rounded-full">
                    <RefreshCw className="h-5 w-5 text-emerald-500 animate-spin-slow" />
                </div>
                <div className="flex-1">
                    <h4 className="font-medium text-white text-sm">Actualización disponible</h4>
                    <p className="text-xs text-zinc-400 mt-1">
                        Hay una nueva versión de la app. Recarga para aplicar mejora.
                    </p>
                </div>
            </div>
            <div className="flex gap-2 mt-2 justify-end">
                <button
                    onClick={() => setUpdateAvailable(false)}
                    className="text-xs text-zinc-400 hover:text-white px-3 py-1.5"
                >
                    Ignorar
                </button>
                <button
                    onClick={handleReload}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-4 py-1.5 rounded-md transition-colors"
                >
                    Actualizar
                </button>
            </div>
        </div>
    );
}
