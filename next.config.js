/** @type {import('next').NextConfig} */
const nextConfig = {
  // Convex 客户端需要外部化
  webpack: (config) => {
    config.externals = config.externals || [];
    return config;
  },
};

module.exports = nextConfig;