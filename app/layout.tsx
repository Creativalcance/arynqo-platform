import type { Metadata, Viewport } from "next";
import "./globals.css";
import RootLayoutShell from "@/app/components/RootLayoutShell";

export const metadata: Metadata = {
  title: {
    default: "ARYNQO | Where talent evolves",
    template: "%s | ARYNQO",
  },
  description:
    "ARYNQO é uma plataforma inteligente de recrutamento, matching e evolução profissional com IA.",
  applicationName: "ARYNQO",
  appleWebApp: {
    capable: true,
    title: "ARYNQO",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#050816",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className="bg-white text-neutral-900 antialiased">
        <RootLayoutShell>{children}</RootLayoutShell>
      </body>
    </html>
  );
}