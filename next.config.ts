import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "192.168.1.161",
    "192.168.1.75",
    "*.loca.lt",
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
