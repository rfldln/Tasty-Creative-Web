/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add this option to disable ESLint during builds
  eslint: {
    // Only run ESLint on local development, not during production builds
    ignoreDuringBuilds: true,
  },
  // Add any other existing config options here
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
  // Enable CORS for local development
  async headers() {
    return [
      {
        source: "/api/notifications",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Allow all origins (you can adjust this for stricter control)
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
    ];
  },
};

module.exports = nextConfig;
