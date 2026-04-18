/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/codex',
        destination: '/oracle',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
