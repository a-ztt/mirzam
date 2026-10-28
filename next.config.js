/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      // http → https (for crawlers that hit http directly)
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
        destination: "https://mirzam.kz/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  experimental: {
    devtoolSegmentExplorer: false,
    serverActions: {
      // Allow image uploads via Server Actions
      bodySizeLimit: "50mb",
    },
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid noisy filesystem cache warnings on Windows (ENOENT for *.pack.gz)
      // after clearing .next or during rapid restarts.
      config.cache = { type: "memory" };
    }
    return config;
  },
};

module.exports = nextConfig;
