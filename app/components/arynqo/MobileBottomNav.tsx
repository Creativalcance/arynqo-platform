"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  {
    href: "/app",
    label: "Início",
  },
  {
    href: "/app/vagas",
    label: "Vagas",
  },
  {
    href: "/app/matches",
    label: "Matches",
  },
  {
    href: "/app/academia",
    label: "Academy",
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 z-20 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 grid-cols-4 rounded-[1.6rem] border border-white/10 bg-[#070b1d]/90 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
      {navItems.map((item) => {
        const isActive =
          item.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "rounded-2xl bg-white/10 px-2 py-3 text-center text-xs font-medium text-white"
                : "rounded-2xl px-2 py-3 text-center text-xs font-medium text-white/55 transition hover:bg-white/8 hover:text-white"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}