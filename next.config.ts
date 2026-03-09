import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["canvas", "canvas-dither", "pg-listen"],
};

export default nextConfig;
