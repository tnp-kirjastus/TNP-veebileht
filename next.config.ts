import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
    formats: ["image/webp", "image/avif"],
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const scriptSrc = `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`;
    const securityHeaders = [
      { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; form-action 'self' https://*.maksekeskus.ee; frame-ancestors 'none'; frame-src https://www.google.com; object-src 'none'; img-src 'self' data: blob: https://*.supabase.co https://*.google.com https://*.gstatic.com; font-src 'self'; style-src 'self' 'unsafe-inline'; ${scriptSrc}; connect-src 'self' https://*.supabase.co; upgrade-insecure-requests` },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" });
    }
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  compress: true,
};

export default nextConfig;
