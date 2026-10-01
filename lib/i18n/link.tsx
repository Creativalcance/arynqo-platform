"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { localizedPath } from "./config";
import { useI18n } from "./client";
export default function LocalizedLink({ href, title, "aria-label": ariaLabel, ...props }: ComponentProps<typeof Link>) {
  const { locale, t } = useI18n();
  const localized = typeof href === "string" ? localizedPath(href, locale) : { ...href, pathname: href.pathname ? localizedPath(href.pathname, locale) : href.pathname };
  return <Link {...props} href={localized} title={title ? t(title) : title} aria-label={ariaLabel ? t(ariaLabel) : ariaLabel} />;
}
