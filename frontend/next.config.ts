import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN || 'ukmfotografitelkom.com',
    `${process.env.NEXT_PUBLIC_SHORTLINK_SUBDOMAIN || 'link'}.${process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN || 'ukmfotografitelkom.com'}`,
    `${process.env.NEXT_PUBLIC_SHORTLINK_SUBDOMAIN || 'link'}.localhost`,
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  devIndicators: false,

  /**
   * Proxy /api/* → localhost:8000 HANYA saat development.
   *
   * Di production, Nginx yang intercept semua request /api/ dan
   * meneruskannya ke uft_backend:8000 — sehingga rewrite ini
   * tidak pernah dieksekusi dan tidak berpengaruh sama sekali.
   */
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};

export default nextConfig;