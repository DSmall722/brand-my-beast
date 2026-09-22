import type { NextConfig } from "next";
import {
  SECURITY_HEADERS,
  securityHeadersSource,
} from "./src/lib/security-headers";

const nextConfig: NextConfig = {
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
