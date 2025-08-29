/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true, // включаем app router
  },
  // Подсказываем Next искать app/ внутри src/
  pageExtensions: ["ts", "tsx"],
};

module.exports = nextConfig;
