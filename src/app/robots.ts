import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const origin = siteUrl().origin;
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/haldus/", "/api/"] },
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "OAI-SearchBot", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "anthropic-ai", disallow: "/" },
      { userAgent: "Claude-Web", disallow: "/" },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
