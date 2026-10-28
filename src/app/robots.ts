import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://mirzam.kz";
  return raw.replace(/\/$/, "");
}
