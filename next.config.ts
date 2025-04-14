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
  env: {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
  },
  webpack: (config) => {
    // Add rule to handle model files
    config.module.rules.push({
      test: /\.bin$/,
      type: 'asset/resource',
    });
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['@xenova/transformers'],
  },
};

export default nextConfig;
