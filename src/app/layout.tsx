import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import ElasticCursor from "@/components/animations/elasticCursor";
import CanvasBackground from "@/components/animations/CanvasBackground";

export const metadata: Metadata = {
  title: "George Ma",
  description:
    "George Ma's Portfolio",
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
      </body>
    </html>
  );
}
