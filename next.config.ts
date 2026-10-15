import type { NextConfig } from "next";
import {
  SECURITY_HEADERS,
  securityHeadersSource,
} from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["nodemailer"],
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
