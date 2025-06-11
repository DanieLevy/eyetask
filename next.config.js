/** @type {import('next').NextConfig} */

const nextConfig = {
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
  },
  // External packages for server components
  serverExternalPackages: [],
};

module.exports = nextConfig; 