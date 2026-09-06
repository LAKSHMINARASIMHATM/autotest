import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.huggingface.co",
      },
      {
        protocol: "https",
        hostname: "**.hf.space",
      },
    ],
  },
};

export default nextConfig;
