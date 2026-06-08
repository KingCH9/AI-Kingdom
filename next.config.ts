import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["phaser"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
