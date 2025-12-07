import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
