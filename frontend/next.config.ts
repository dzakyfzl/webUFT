import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['ukmfotografitelkom.com'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Tambahkan baris di bawah ini:
  devIndicators: false
};

export default nextConfig;