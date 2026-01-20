import type { Metadata } from "next";
import "./globals.css";
import { ConvexProvider } from "@/lib/convex/provider";

export const metadata: Metadata = {
  title: "Almacén - Control de Stock",
  description: "Sistema de control de stock y pedidos internos",
  icons: {
    icon: "/vistacampo-favicon.png",
    shortcut: "/vistacampo-favicon.png",
    apple: "/vistacampo-favicon.png",
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
