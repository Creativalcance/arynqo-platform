import { getT } from "@/lib/i18n/server";
import { LocaleSelect } from "@/lib/i18n/client";
import type { Metadata } from "next";
import MobileProfileShortcut from "../components/arynqo/MobileProfileShortcut";

export async function generateMetadata(): Promise<Metadata> { const t=await getT(); return {
  title: t("Aplicação"),
  robots: { index: false, follow: false },
  description:
    t("ARYNQO para candidatos e empresas em todo o mundo."),
}; }

export default function AppMobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-3"><LocaleSelect className="ml-auto max-w-48" /></div>
      {children}
      <MobileProfileShortcut />
    </>
  );
}