import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ["avatars.githubusercontent.com"],
  },
  //...other next.config.js options...
  reactStrictMode: true, // Enable stricter type checking in development
};

export default nextConfig;
