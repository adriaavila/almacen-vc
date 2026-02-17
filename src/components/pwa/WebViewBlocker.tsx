"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

export function WebViewBlocker() {
    const [isWebView, setIsWebView] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        // Detect Instagram, Facebook, LinkedIn, etc.
        // "wv" is often present in Android WebView user agents
        // "FBAN", "FBAV" -> Facebook
        // "Instagram" -> Instagram
        const rules = [
            /Instagram/i,
            /FBAN/i,
            /FBAV/i,
            /LinkedInApp/i,
            // Generic Android WebView check (often includes 'wv')
            // but we want to be careful not to block valid installed PWAs (TWA) if they report as wv?
            // Usually installed PWA runs in standalone mode.
            // Let's target social media wrappers specifically requested.
        ];

        const isSocialWebView = rules.some((rule) => rule.test(userAgent));

        if (isSocialWebView) {
            setIsWebView(true);
        }
    }, []);

    if (!isWebView) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-900/95 p-6 backdrop-blur-sm text-center">
            <div className="max-w-md space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <ExternalLink className="h-8 w-8" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">
                        Abre en Chrome
                    </h2>
                    <p className="text-zinc-300">
                        Para usar esta aplicación y poder instalarla, necesitas abrirla en el navegador Chrome.
                    </p>
                </div>

                <div className="rounded-lg bg-zinc-800 p-4 text-left text-sm text-zinc-400">
                    <p className="mb-2 font-medium text-white">Pasos:</p>
                    <ol className="list-decimal space-y-1 pl-4">
                        <li>Toca los <span className="font-bold text-white">3 puntos</span> (menú) arriba a la derecha.</li>
                        <li>Selecciona <span className="font-bold text-white">"Abrir en Chrome"</span> o "Open in Browser".</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
