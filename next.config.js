/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.cuewizard.com',
      },
    ],
  },
};

module.exports = nextConfig;
