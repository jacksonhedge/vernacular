import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vernacular — VIP Relationship Management in Blue iMessage",
  description:
    "AI-powered iMessage CRM for VIP hosts. Dedicated lines, ghost agents, team visibility. $333/seat/month.",
  metadataBase: new URL("https://vernacular.chat"),
  openGraph: {
    title: "Vernacular — VIP Relationship Management in Blue iMessage",
    description:
      "AI-powered iMessage CRM for VIP hosts. Dedicated lines, ghost agents, team visibility. $333/seat/month.",
    url: "https://vernacular.chat/vip",
    siteName: "Vernacular",
    images: [
      {
        url: "https://vernacular.chat/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vernacular — VIP Relationship Management in Blue iMessage",
        type: "image/png",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vernacular — VIP Relationship Management in Blue iMessage",
    description:
      "AI-powered iMessage CRM for VIP hosts. Dedicated lines, ghost agents, team visibility. $333/seat/month.",
    images: ["https://vernacular.chat/og-image.png"],
  },
};

export default function VIPLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
