"use client";
import { LElement } from "@/lib/i18n/client";


import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "@/lib/i18n/navigation";
import { parseCookiePreferences } from "@/lib/cookie-preferences";
import { getCookiePreferencesSnapshot, getServerCookiePreferencesSnapshot, subscribeCookiePreferences, SERVER_COOKIE_SNAPSHOT } from "@/lib/cookie-preferences-store";
import { analyticsPage, clearAnalyticsCookies, stopAnalyticsFrame } from "@/lib/google-analytics";

function analyticsFrameRef(element: HTMLIFrameElement | null) {
  if (element) return () => stopAnalyticsFrame(element);
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const snapshot = useSyncExternalStore(subscribeCookiePreferences, getCookiePreferencesSnapshot, getServerCookiePreferencesSnapshot);
  const allowed = parseCookiePreferences(snapshot)?.choice === "analytics";
  const page = analyticsPage(pathname);
  useEffect(() => {
    if (snapshot !== SERVER_COOKIE_SNAPSHOT && !allowed) clearAnalyticsCookies();
  }, [snapshot, allowed]);
  if (!allowed || !page) return null;
  return <LElement as="iframe" data-arynqo-analytics="true" ref={analyticsFrameRef} key={pathname} title="Medição estatística autorizada" aria-hidden="true" tabIndex={-1} className="fixed left-[-10000px] top-0 h-px w-px border-0" referrerPolicy="no-referrer" src={`/api/analytics-frame?page=${encodeURIComponent(page)}`} onLoad={(event) => event.currentTarget.contentWindow?.postMessage({ type: "arynqo:analytics-authorised" }, window.location.origin)} />;
}
