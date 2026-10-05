import type { NextConfig } from "next";
import {
  SECURITY_HEADERS,
  securityHeadersSource,
} from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // CI shards start two `next dev` processes. Each needs its own distDir
  // or they fight over `.next/dev/lock` and the compile cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [
      {
        source: securityHeadersSource(),
        headers: [...SECURITY_HEADERS],
      },
    ];
  },
};

export default nextConfig;
