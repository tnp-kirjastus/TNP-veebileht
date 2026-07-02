import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const origin = siteUrl().origin;
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/haldus/", "/api/"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
