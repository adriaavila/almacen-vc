import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Ensure proper URL handling
  trailingSlash: false,
  // Disable automatic static optimization for dynamic routes if needed
  experimental: {
    // Ensure proper URL resolution
  },
};

export default nextConfig;
