
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'sl.bing.net' },
    ],
  },
  // Fix for cross-origin request warnings in the cloud environment
  experimental: {
    allowedDevOrigins: [
      '6000-firebase-studio-1770083699143.cluster-ocv3ypmyqfbqysslgd7zlhmxek.cloudworkstations.dev',
      'localhost:9002'
    ]
  }
};

export default nextConfig;
