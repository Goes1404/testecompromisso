
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages compatibility
  // output: 'standalone', 
  images: {
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  reactStrictMode: false, // Performance boost
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-icons', 'clsx', 'tailwind-merge'],
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      };
    }
    return config;
  },
};

export default nextConfig;
