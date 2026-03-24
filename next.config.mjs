/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "www.universal-transmissions.net" },
      { protocol: "https", hostname: "vaultofarcana.com" },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000", "www.vaultofarcana.com"] },
  },
  webpack(config) {
    // Treat .md files as raw text — prevents webpack from trying to parse them as JS.
    // This is needed because blog-posts.ts imports .md files as strings.
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
