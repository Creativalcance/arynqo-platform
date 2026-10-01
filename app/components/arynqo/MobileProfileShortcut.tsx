"use client";
import { LText } from "@/lib/i18n/client";


import Link from "@/lib/i18n/link";
import { usePathname } from "@/lib/i18n/navigation";
import { useAppProfile } from "../../hooks/useAppProfile";

function getInitial(name: string | null | undefined, email: string | null | undefined) {
  if (name && name.trim().length > 0) {
    return name.trim().charAt(0).toUpperCase();
  }

  if (email && email.trim().length > 0) {
    return email.trim().charAt(0).toUpperCase();
  }

  return "P";
}

export default function MobileProfileShortcut() {
  const pathname = usePathname();
  const { profile, hasSession, roleLabel } = useAppProfile();

  const isActive = pathname === "/app/perfil";
  const initial = getInitial(profile?.name, profile?.email);

  return (
    <Link
      href={hasSession ? "/app/perfil" : "/login"}
      className={
        isActive
          ? "fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300 px-3 py-2 text-[#06111f] shadow-2xl shadow-cyan-950/40"
          : "fixed bottom-24 right-4 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-[#070b1d]/92 px-3 py-2 text-white shadow-2xl shadow-black/40 backdrop-blur-xl transition hover:border-cyan-300/40 hover:bg-[#0b1128]"
      }
    >
      <span
        className={
          isActive
            ? "flex h-8 w-8 items-center justify-center rounded-full bg-[#06111f] text-xs font-bold text-cyan-200"
            : "flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300 text-xs font-bold text-[#06111f]"
        }
      >
        <LText text={initial} />
      </span>

      <span className="pr-1 text-xs font-semibold">
        <LText text={hasSession ? roleLabel : "Entrar"} />
      </span>
    </Link>
  );
}