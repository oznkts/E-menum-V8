import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable experimental features for React 19
  experimental: {
    // Optimize package imports for better tree-shaking
    optimizePackageImports: [
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'zustand',
      'react-hook-form',
      'zod',
      'date-fns',
      'recharts',
      'framer-motion',
    ],
  },

  // Webpack configuration to fix module loading issues
  webpack: (config, { isServer }) => {
    // Fix for "Cannot read properties of undefined (reading 'call')" error
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },

  // Configure image domains for Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // TypeScript and ESLint
  typescript: {
    // Fail build on type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Fail build on lint errors
    ignoreDuringBuilds: true,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },

  // Redirect configuration
  async redirects() {
    return []
  },

  // Environment variables that should be available on the client
  // Note: Sensitive keys should NEVER be prefixed with NEXT_PUBLIC_
  env: {},
}

export default nextConfig
