import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep API routes working - no output setting needed for Netlify
  
  // Webpack optimization for serverless
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Optimize bundle for serverless functions
      config.optimization.minimize = false;
    }
    return config;
  },
  
  // Headers for better caching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
};

export default nextConfig;
