import type { Metadata, Viewport } from "next";
import { Cinzel_Decorative, Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import PWARegister from "@/components/PWARegister";
import "./globals.css";

const cinzel = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-cinzel",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jakarta",
});

const SITE_URL = "https://nicbeautty-novo.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Nicbeautty | Lash Designer Specialist",
    template: "%s | Nicbeautty",
  },
  description:
    "Técnicas exclusivas de extensão de cílios com acabamento sofisticado, máxima durabilidade e total biossegurança. Agende seu horário pelo WhatsApp.",
  keywords: [
    "extensão de cílios",
    "lash designer",
    "cílios São Paulo",
    "volume brasileiro",
    "fio a fio",
    "efeito fox eyes",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Nicbeautty Lash Designer",
    title: "Nicbeautty | Lash Designer Specialist",
    description:
      "Realce a beleza e a elegância do seu olhar. Extensão de cílios com acabamento sofisticado e máxima durabilidade.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nicbeautty | Lash Designer Specialist",
    description:
      "Extensão de cílios com acabamento sofisticado, máxima durabilidade e total biossegurança.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nicbeautty",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: "Nicbeautty Lash Designer",
    alternateName: "Nicbeautty",
    url: SITE_URL,
    image: `${SITE_URL}/icons/icon-512.png`,
    telephone: "+55-11-93213-9081",
    priceRange: "R$$",
    address: {
      "@type": "PostalAddress",
      addressLocality: "São Paulo",
      addressRegion: "SP",
      addressCountry: "BR",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00",
        closes: "19:00",
      },
    ],
    sameAs: ["https://instagram.com/nicbeautty"],
    makesOffer: [
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Extensão de Cílios Fio a Fio" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Volume Brasileiro" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Volume Fox Eyes" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Design de Sobrancelhas" } },
    ],
  };
  return (
    <html lang="pt-BR">
      <body className={`${cinzel.variable} ${cormorant.variable} ${jakarta.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
        <PWARegister />
      </body>
    </html>
  );
}
