/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add this option to disable ESLint during builds
  eslint: {
    // Only run ESLint on local development, not during production builds
    ignoreDuringBuilds: true,
  },
  // Add any other existing config options here
};

module.exports = nextConfig;