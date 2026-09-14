import type { NextConfig } from "next";

const IMMUTABLE = "public, max-age=31536000, immutable";

const nextConfig: NextConfig = {
  // `devIndicators` only supports `position` in current Next.js versions.
  devIndicators: false,
  // Smaller client bundle: only the three.js modules actually imported ship.
  experimental: {
    optimizePackageImports: ["three", "gsap"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        pathname: "/images/**",
      },
    ],
  },
  // /resume used to be a Node route handler, which meant the deployment had a
  // serverless function to cold-start. Serving the PDF straight from the CDN
  // keeps the pretty URL with zero functions.
  async rewrites() {
    return [{ source: "/resume", destination: "/assets/George_Ma_Resume.pdf" }];
  },
  async headers() {
    return [
      {
        source: "/assets/opt/:path*",
        headers: [{ key: "Cache-Control", value: IMMUTABLE }],
      },
      {
        source: "/helvetica-255/:path*",
        headers: [{ key: "Cache-Control", value: IMMUTABLE }],
      },
    ];
  },
};

export default nextConfig;
