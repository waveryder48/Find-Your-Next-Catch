/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: { serverActions: { allowedOrigins: ['*'] } },
  images: { domains: [] }
};
module.exports = nextConfig;
