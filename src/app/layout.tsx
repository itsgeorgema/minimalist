import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ElasticCursor from "@/components/animations/elasticCursor";
import CanvasBackground from "@/components/animations/CanvasBackground";
import { Analytics } from "@vercel/analytics/next";

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
