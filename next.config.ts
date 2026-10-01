import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal self-contained server for the Docker runner image.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
