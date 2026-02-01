/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // PWA configuration will be added with next-pwa
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // For photo uploads
    },
  },
};

module.exports = nextConfig;
