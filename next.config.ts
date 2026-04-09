import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `devIndicators` only supports `position` in current Next.js versions.
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
