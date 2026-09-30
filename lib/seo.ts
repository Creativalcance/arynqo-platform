import type { Metadata } from "next";
export const SITE_URL = "https://www.arynqo.com";
export function pageMetadata(title: string, description: string, path: string): Metadata {
  return { title, description, alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: { title, description, url: `${SITE_URL}${path}`, siteName: "ARYNQO", locale: "pt_PT", type: "website" },
    twitter: { card: "summary", title, description } };
}
export function safeReturnPath(value: string | null): string {
  if (!value || !/^\/vagas\/[a-f0-9-]{36}$/.test(value)) return "/dashboard";
  return value;
}
