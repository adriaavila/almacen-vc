"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handler = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Update UI notify the user they can install the PWA
            setShowPrompt(true);
        };

        window.addEventListener("beforeinstallprompt", handler);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Hide the app provided install promotion
        setShowPrompt(false);
        // Show the install prompt
        await deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const choiceResult = await deferredPrompt.userChoice;

        if (choiceResult.outcome === "accepted") {
            console.log("User accepted the install prompt");
        } else {
            console.log("User dismissed the install prompt");
        }

        setDeferredPrompt(null);
    };

    if (!showPrompt || pathname !== "/") return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between rounded-full bg-emerald-600 px-4 py-2 shadow-lg text-white md:left-auto md:right-8 md:w-auto animate-in slide-in-from-bottom-10 fade-in duration-500 gap-4">
            <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="font-medium text-sm">Instalar Aplicación</span>
            </div>
            <div className="flex gap-2 items-center">
                <button
                    onClick={handleInstallClick}
                    className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm hover:bg-gray-100 whitespace-nowrap"
                >
                    Instalar
                </button>
                <button
                    onClick={() => setShowPrompt(false)}
                    className="rounded-full p-1 hover:bg-white/10"
                    aria-label="Cerrar"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
