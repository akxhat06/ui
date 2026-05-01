import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/onepiece",
  logging: {
    incomingRequests: false,
  },
};

export default nextConfig;
