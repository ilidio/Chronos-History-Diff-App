import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  outputFileTracingRoot: path.join(__dirname, './'),
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals = [...(config.externals || []), 'electron'];
    }
    return config;
  }
};

export default nextConfig;
