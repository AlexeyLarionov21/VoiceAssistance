/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // не валить билд на ESLint-ошибках
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
