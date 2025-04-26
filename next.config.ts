/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add this option to disable ESLint during builds
  eslint: {
    // Only run ESLint on local development, not during production builds
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
        pathname: "/**",
      },
    ],
  },
  // Enable necessary headers
  async headers() {
    return [
      // Apply CORS headers only for /api/notifications
      {
        source: "/api/notifications",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Allow all origins (adjust as needed)
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, x-api-key",
          },
        ],
      },
      // Apply cross-origin isolation headers globally
      {
        source: "/:path*", // Match all routes
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack(config: any, { isServer }: { isServer: boolean }) {
    // Fix for dynamic import issue with @ffmpeg/ffmpeg
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
        url: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
