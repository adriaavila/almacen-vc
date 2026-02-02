import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // CacheFirst para fuentes de Google
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 año
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // CacheFirst para assets estáticos de Next.js
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 año
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // CacheFirst para assets públicos (imágenes, iconos, etc.)
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure proper URL handling
  trailingSlash: false,
  // Disable automatic static optimization for dynamic routes if needed
  experimental: {
    // Optimize barrel imports for better tree-shaking
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-label',
      '@radix-ui/react-select',
      'recharts',
    ],
  },
  // PWA plugin uses webpack, so we need to configure turbopack
  turbopack: {
    root: "/Users/ama/projects/almacen-vc",
  },
};

export default pwaConfig(nextConfig);
