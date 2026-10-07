import type { MetadataRoute } from "next";
import { CATEGORIAS } from "@/lib/comum";
import { slugsPublicos } from "@/lib/produtos";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = (process.env.SITE_URL || "http://localhost:3100").replace(/\/+$/, "");
  const produtos = await slugsPublicos();
  return [
    { url: `${site}/`, changeFrequency: "daily", priority: 1 },
    { url: `${site}/loja`, changeFrequency: "daily", priority: 0.9 },
    ...CATEGORIAS.map((c) => ({ url: `${site}/loja?categoria=${c.id}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...produtos.map((p) => ({ url: `${site}/produto/${p.slug}`, lastModified: p.atualizadoEm, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
