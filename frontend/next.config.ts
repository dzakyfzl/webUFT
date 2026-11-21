import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.ERP_NEXT_DIST_DIR || '.next',
  typescript: { tsconfigPath: process.env.ERP_TS_CONFIG_PATH || 'tsconfig.json' },
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
  experimental: { proxyClientMaxBodySize: '21mb' },

  // Keep the ERP prefix intact in both local development and the Compose network.
  // The legacy public API remains outside the ERP contract.
  async rewrites() {
    const backendOrigin = process.env.ERP_BACKEND_ORIGIN ||
      (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : 'http://backend:8000');
    const erpRoutes = [
      { source: '/api/admin/:path*', destination: `${backendOrigin}/api/admin/:path*` },
      { source: '/api/public/:path*', destination: `${backendOrigin}/api/public/:path*` },
      { source: '/api/shortlink/r/:slug', destination: `${backendOrigin}/api/shortlink/r/:slug` },
      { source: '/api/health', destination: `${backendOrigin}/api/health` },
      { source: '/api/ready', destination: `${backendOrigin}/api/ready` },
    ];
    if (process.env.NODE_ENV !== 'development') return erpRoutes;
    return [...erpRoutes,
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};

export default nextConfig;
