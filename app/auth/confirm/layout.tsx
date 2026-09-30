import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirmar email | ARYNQO",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ConfirmationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
