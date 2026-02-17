import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConvexProvider } from "@/lib/convex/provider";
import { OfflineSyncManager } from "@/components/offline/OfflineSyncManager";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { poppins, workSans } from "@/lib/fonts";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { WebViewBlocker } from "@/components/pwa/WebViewBlocker";
import { PwaLifecycle } from "@/components/pwa/PwaLifecycle";

export const metadata: Metadata = {
  title: "Vistacampo",
  description: "app de operacion interna de VC",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    shortcut: "/favicon-32x32.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vistacampo",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${poppins.variable} ${workSans.variable}`}>
      <head>
        <meta name="theme-color" content="#10b981" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Saltar al contenido principal
        </a>
        <ConvexProvider>
          <OfflineBanner />
          <OfflineSyncManager />
          <InstallPrompt />
          <WebViewBlocker />
          <PwaLifecycle />
          {children}
        </ConvexProvider>
      </body>
    </html>
  );
}
