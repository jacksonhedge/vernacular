import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vernacular — The iMessage Internet Protocol",
  description: "The iMessage Internet Protocol",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL("https://vernacular.chat"),
  openGraph: {
    title: "Vernacular — The iMessage Internet Protocol",
    description: "The iMessage Internet Protocol",
    url: "https://vernacular.chat",
    siteName: "Vernacular",
    images: [
      {
        url: "https://vernacular.chat/api/og",
        width: 1200,
        height: 630,
        alt: "Vernacular — The iMessage Internet Protocol",
        type: "image/png",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vernacular — The iMessage Internet Protocol",
    description: "The iMessage Internet Protocol",
    images: ["https://vernacular.chat/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
