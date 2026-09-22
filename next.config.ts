import type { NextConfig } from "next";
import {
  SECURITY_HEADERS,
  securityHeadersSource,
} from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      {
        source: "/terms",
        destination: "/privacy",
        permanent: true,
      },
    ];
  },
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
