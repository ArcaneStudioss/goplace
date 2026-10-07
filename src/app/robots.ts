import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = (process.env.SITE_URL || "http://localhost:3100").replace(/\/+$/, "");
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/entrar", "/pedido", "/sacola"] }], sitemap: `${site}/sitemap.xml` };
}
