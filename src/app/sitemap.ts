import type { MetadataRoute } from "next";
import { getAllSlugs } from "@/lib/marketing-actions";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://nicbeautty-novo.vercel.app";
  const slugs = await getAllSlugs();
  const blogPosts = slugs.map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/catalogo`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/planos`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/promocoes`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/indicar`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    ...blogPosts,
  ];
}