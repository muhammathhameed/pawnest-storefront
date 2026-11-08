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
  title: "AuraFinds | Curated Viral Finds Across Every Category",
  description:
    "Discover curated viral finds across pet care, beauty, skincare, smart tech, and more.",
  metadataBase: getMetadataBase(),
  openGraph: {
    title: "AuraFinds",
    description: "Curated Viral Finds Across Every Category",
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
