import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["canvas", "canvas-dither", "pg-listen", "pg-format"],
};

export default nextConfig;
