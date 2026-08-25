import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://nicbeautty-novo.vercel.app";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/catalogo`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/planos`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
