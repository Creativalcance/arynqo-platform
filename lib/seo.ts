import type { Metadata } from "next";
import { getLocale, getT } from "./i18n/server";
import { localizedPath, localeAlternates, locales } from "./i18n/config";
export const SITE_URL = "https://www.arynqo.com";
export async function pageMetadata(sourceTitle: string, sourceDescription: string, path: string, translateContent = true): Promise<Metadata> {
  const locale = await getLocale(); const t = await getT();
  const title = translateContent ? t(sourceTitle) : sourceTitle, description = translateContent ? t(sourceDescription) : sourceDescription;
  const url = `${SITE_URL}${localizedPath(path, locale)}`;
  const ogLocales = {pt:"pt_PT",en:"en_US",fr:"fr_FR",es:"es_ES",de:"de_DE",it:"it_IT"};
  return { title: {absolute:`${title} | ARYNQO`}, description, alternates: { canonical: url, languages: localeAlternates(path) },
    openGraph: { title, description, url, siteName: "ARYNQO", locale: ogLocales[locale], alternateLocale: locales.filter(code => code !== locale).map(code => ogLocales[code]), type: "website" },
    twitter: { card: "summary", title, description } };
}
export function safeReturnPath(value: string | null): string {
  if (!value || !/^\/(?:en\/|fr\/|es\/|de\/|it\/)?vagas\/(?:externas\/)?[a-f0-9-]{36}$/.test(value)) return "/dashboard";
  return value;
}
