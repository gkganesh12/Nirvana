/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@signalcraft/shared", "@signalcraft/config", "@signalcraft/database"],
};

module.exports = nextConfig;
