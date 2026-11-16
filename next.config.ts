import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
};
export default config;
