import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server actions default to a 1 MB body; photo and cover uploads allow up to 5 MB.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
