import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vernacular — iMessage CRM",
  description: "Talk to your users at scale via iMessage",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Vernacular — iMessage CRM",
    description: "Talk to your users at scale via iMessage",
    url: "https://vernacular.chat",
    siteName: "Vernacular",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Vernacular",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Vernacular — iMessage CRM",
    description: "Talk to your users at scale via iMessage",
    images: ["/icon-512.png"],
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
      </body>
    </html>
  );
}
