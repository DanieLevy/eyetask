import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
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
    serverActions: {},
    serverComponentsExternalPackages: ['cloudinary']
  },
  // External packages for server components
  serverExternalPackages: [],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent this error on build --> Error: Can't resolve 'fs'
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
      };
    }
    
    // Handle cloudinary module
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'cloudinary': 'cloudinary'
      });
    }

    return config;
  },
};

export default nextConfig;
