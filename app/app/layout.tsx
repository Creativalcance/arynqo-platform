import type { Metadata } from "next";
import MobileProfileShortcut from "../components/arynqo/MobileProfileShortcut";

export const metadata: Metadata = {
  title: "APP | ARYNQO",
  description:
    "APP mobile da ARYNQO para talento, matching inteligente, recrutamento com IA e ARYNQO Academy.",
};

export default function AppMobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <MobileProfileShortcut />
    </>
  );
}