import type { NextConfig } from "next";

const API_ORIGIN = process.env.WIREHIRE_API_ORIGIN ?? "https://wirehire.ru";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Build a self-contained server bundle (.next/standalone) for the
  // Docker production image. The runner image only needs the bundle
  // + .next/static + public — no node_modules at runtime.
  output: "standalone",
  // In dev (and prod behind a different origin) proxy /api/* to the
  // real backend so the browser stays on a single origin — no CORS.
  // On wirehire.ru itself nginx routes /api/* directly to Laravel and
  // this rewrite is a no-op.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
