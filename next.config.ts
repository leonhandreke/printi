import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep these out of the webpack bundle (native bindings / dynamic requires).
  serverExternalPackages: ["canvas", "canvas-dither", "pg-listen"],
  // Whole-package include for pg-format — its dynamic require of reserved.js
  // is invisible to @vercel/nft, so the standalone tracer drops files.
  outputFileTracingIncludes: {
    "*": ["./node_modules/pg-format/**"],
  },
};

export default nextConfig;
