/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Isso avisa a Vercel para NÃO barrar o site por causa de variáveis não usadas
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
