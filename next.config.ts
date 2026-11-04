import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '**.run.app',
    '*.run.app',
    'ais-dev-qjukeal4d6zytykjudf7gx-383104297287.europe-west2.run.app',
    'ais-pre-qjukeal4d6zytykjudf7gx-383104297287.europe-west2.run.app',
    '**.google.com',
    '**.googleusercontent.com',
    '**.usercontent.goog',
    '**.vercel.app',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
