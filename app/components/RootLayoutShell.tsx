"use client";

import { useState } from "react";
import GoogleAnalytics from "@/app/components/GoogleAnalytics";
import CookiePreferences from "@/app/components/CookiePreferences";
import { usePathname } from "next/navigation";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

type RootLayoutShellProps = {
  children: React.ReactNode;
};

export default function RootLayoutShell({ children }: RootLayoutShellProps) {
  const pathname = usePathname();
  const [cookiePreferencesOpen, setCookiePreferencesOpen] = useState(false);

  const isAppRoute = pathname === "/app" || pathname.startsWith("/app/");

  if (isAppRoute) {
    return <><GoogleAnalytics />{children}<button type="button" onClick={() => setCookiePreferencesOpen(true)} className="fixed bottom-24 right-4 z-40 rounded-full border border-white/20 bg-[#07111F] px-3 py-2 text-xs text-white shadow-sm">Gerir cookies</button><CookiePreferences open={cookiePreferencesOpen} onOpen={() => setCookiePreferencesOpen(true)} onClose={() => setCookiePreferencesOpen(false)} /></>;
  }

  return (
    <>
      <GoogleAnalytics />
      <Header />
      {children}
      <Footer onManageCookies={() => setCookiePreferencesOpen(true)} />
      <CookiePreferences open={cookiePreferencesOpen} onOpen={() => setCookiePreferencesOpen(true)} onClose={() => setCookiePreferencesOpen(false)} />
    </>
  );
}