import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PawNest Store | Good things for your best friend",
  description:
    "Thoughtful finds and everyday favorites for the pets who make life better.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}