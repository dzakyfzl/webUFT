import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PENTING: Mendaftarkan domain Unsplash agar Next.js Image bisa digunakan
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;