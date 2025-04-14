import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Don't run ESLint during build in production
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't run TypeScript checking during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
