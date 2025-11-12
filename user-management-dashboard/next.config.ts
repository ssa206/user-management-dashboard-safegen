import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Azure Static Web Apps configuration
  distDir: '.next',
};

export default nextConfig;
