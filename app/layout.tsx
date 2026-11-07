import type { Metadata } from "next";
import ToastProvider from "../components/ToastProvider";
import "./globals.css";

function getMetadataBase(): URL | undefined {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.protocol === "http:") return url;
    } catch {
      console.error("Ignoring invalid URL configured for site metadata.");
    }
  }

  return undefined;
}

export const metadata: Metadata = {
  title: "PawNest Store | Good things for your best friend",
  description:
    "Thoughtful finds and everyday favorites for the pets who make life better.",
  metadataBase: getMetadataBase(),
  openGraph: {
    title: "PawNest Store",
    description: "Thoughtful finds and everyday favorites for your pet.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
