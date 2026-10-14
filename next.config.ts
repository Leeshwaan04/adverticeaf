import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  poweredByHeader: false, // Security: Removes X-Powered-By: Next.js to prevent tech fingerprinting
};

export default nextConfig;
