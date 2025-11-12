import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Enable static optimization for Azure Static Web Apps
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
