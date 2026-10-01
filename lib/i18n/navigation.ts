"use client";
import { useMemo } from "react";
import { useRouter as useNextRouter, usePathname as useNextPathname } from "next/navigation";
import { useI18n } from "./client";
import { localizedPath, stripLocale } from "./config";
export function useRouter() {
  const router = useNextRouter(); const { locale } = useI18n();
  return useMemo(() => ({ ...router, push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(localizedPath(href, locale), options), replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(localizedPath(href, locale), options), prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(localizedPath(href, locale), options) }), [router, locale]);
}
export function usePathname() { return stripLocale(useNextPathname()); }
