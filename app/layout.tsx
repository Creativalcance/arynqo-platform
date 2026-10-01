import { serializeStructuredData } from "@/lib/job-schema";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale, getMessages, getT } from "@/lib/i18n/server";
import { languageTags } from "@/lib/i18n/config";
import RootLayoutShell from "@/app/components/RootLayoutShell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const locale = await getLocale();
  return {
  metadataBase: new URL("https://www.arynqo.com"),
  title: {
    default: "ARYNQO | Where talent evolves",
    template: "%s | ARYNQO",
  },
  description:
    t("ARYNQO liga candidatos e empresas em todo o mundo. Descobre oportunidades de emprego, apresenta o teu perfil e recruta talento."),
  applicationName: "ARYNQO",
  appleWebApp: {
    capable: true,
    title: "ARYNQO",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: `/api/manifest?lang=${locale}`,
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050816",
  colorScheme: "dark light",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  return (
    <html lang={languageTags[locale]}>
      <body className="bg-white text-neutral-900 antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData({"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":"https://www.arynqo.com/#organization",name:"ARYNQO",legalName:"CRIATIVALCANCE, UNIPESSOAL LDA",url:"https://www.arynqo.com",logo:"https://www.arynqo.com/logo-arynqo.png"},{"@type":"WebSite","@id":"https://www.arynqo.com/#website",name:"ARYNQO",url:"https://www.arynqo.com",inLanguage:["pt-PT","en","fr","es","de","it"],publisher:{"@id":"https://www.arynqo.com/#organization"}}]}) }} />
        <I18nProvider locale={locale} messages={messages}><RootLayoutShell>{children}</RootLayoutShell></I18nProvider>
      </body>
    </html>
  );
}