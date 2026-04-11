/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/journal/yugen", destination: "/gallery", permanent: false },
      { source: "/journal/yugen-kolm-album-artwork", destination: "/gallery", permanent: false },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.squarespace-cdn.com" },
      { protocol: "https", hostname: "www.universal-transmissions.net" },
      { protocol: "https", hostname: "www.universal-transmissions.com" },
      { protocol: "https", hostname: "universal-transmissions.com" },
      { protocol: "https", hostname: "vaultofarcana.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "googledrive.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000", "www.vaultofarcana.com"] },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
