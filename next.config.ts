import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow all external image domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    // Disable image optimization for Netlify compatibility
    // This prevents 500 errors when using next/image
    unoptimized: true,
  },
  // Enable server components
  experimental: {
    serverActions: {}
  },
  // External packages for server components
  serverExternalPackages: ['cloudinary'],
  // Turbopack configuration for Next.js 16 compatibility
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      // Ensure server-only modules work correctly
      'cloudinary': 'cloudinary',
    },
  },
};

export default nextConfig;
