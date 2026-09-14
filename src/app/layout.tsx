import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ElasticCursor from "@/components/animations/elasticCursor";
import CanvasBackground from "@/components/animations/CanvasBackgroundLazy";
import { Analytics } from "@vercel/analytics/next";
import { HERO_PRELOAD_HREF, HERO_SIZES, HERO_SRCSET } from "@/lib/heroImage";

export const metadata: Metadata = {
  title: "George Ma",
  description:
    "George Ma's Portfolio",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Start the LCP hero fetch during HTML parse, before the client bundle
            is even downloaded. Browsers without AVIF ignore this and fall back
            to the <picture> sources. */}
        <link
          rel="preload"
          as="image"
          type="image/avif"
          href={HERO_PRELOAD_HREF}
          imageSrcSet={HERO_SRCSET.avif}
          imageSizes={HERO_SIZES}
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/helvetica-255/Helvetica.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/helvetica-255/helvetica-light-587ebe5a59211.woff2"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }",
          }}
        />
      </head>
      <body className="intro-active" suppressHydrationWarning>
        <CanvasBackground />
        {children}
        <ElasticCursor />
        <Analytics />
      </body>
    </html>
  );
}
