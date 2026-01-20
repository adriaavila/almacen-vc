import type { Metadata } from "next";
import "./globals.css";
import { ConvexProvider } from "@/lib/convex/provider";

export const metadata: Metadata = {
  title: "Vistacampo",
  description: "Sistema de control de stock y pedidos internos",
  icons: {
    icon: [
      { url: "/vistacampo-favicon.png", type: "image/png", sizes: "512x512" },
      { url: "/vistacampo-favicon.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/vistacampo-favicon.png",
    apple: [
      { url: "/vistacampo-favicon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  themeColor: "#10b981",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vistacampo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/vistacampo-favicon.png" />
        <meta name="theme-color" content="#10b981" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <ConvexProvider>{children}</ConvexProvider>
      </body>
    </html>
  );
}
