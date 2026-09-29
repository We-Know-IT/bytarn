import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // nodemailer uses Node built-ins (net/tls) and is only used by route handlers.
  serverExternalPackages: ['nodemailer'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
