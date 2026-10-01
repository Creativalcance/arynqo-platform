"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  role: "student" | "company" | "admin";
};

export default function Header() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  useEffect(() => {
    let disposed = false;
    let sequence = 0;
    function checkAdminUnlock() {
      setIsAdminUnlocked(window.localStorage.getItem("arynqo_admin_unlocked") === "true");
    }
    async function checkSession() {
      const current = ++sequence;
      const { data } = await supabase.auth.getSession();
      if (disposed || current !== sequence) return;
      const session = data.session;
      setIsAuthenticated(Boolean(session));
      if (!session) {
        setProfile(null);
        setUnreadCount(0);
        return;
      }
      const [profileResult, notificationResult] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", session.user.id).single(),
        supabase.from("notifications").select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id).or("is_read.eq.false,is_read.is.null"),
      ]);
      if (disposed || current !== sequence) return;
      if (!profileResult.error) setProfile((profileResult.data as Profile) || null);
      if (!notificationResult.error) setUnreadCount(notificationResult.count || 0);
    }
    function refresh() { void checkSession(); }
    function handleStorage(event: StorageEvent) {
      checkAdminUnlock();
      if (event.key === "arynqo-notifications-changed") refresh();
    }
    refresh();
    checkAdminUnlock();
    window.addEventListener("arynqo-admin-unlocked", checkAdminUnlock);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("arynqo-notifications-changed", refresh);
    window.addEventListener("focus", refresh);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Run outside the auth callback to avoid awaiting Supabase queries under its lock.
      setTimeout(() => { if (!disposed) { refresh(); checkAdminUnlock(); } }, 0);
    });
    return () => {
      disposed = true;
      subscription.unsubscribe();
      window.removeEventListener("arynqo-admin-unlocked", checkAdminUnlock);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("arynqo-notifications-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function closeMenu() {
    setIsMenuOpen(false);
  }

  const logoHref = isAuthenticated ? "/dashboard" : "/";

  const navigationLinks = useMemo(() => {
    if (!isAuthenticated) {
      return [
        {
          href: "/",
          label: "Home",
        },
        {
          href: "/vagas",
          label: "Vagas",
        },
        {
          href: "/academia",
          label: "Academia",
        },
      ];
    }

    if (profile?.role === "admin") {
      const adminLinks = [
        {
          href: "/dashboard",
          label: "Dashboard",
        },
        {
          href: "/academia",
          label: "Academia",
        },
        {
          href: "/vagas",
          label: "Vagas",
        },
      ];

      if (isAdminUnlocked) {
        return [
          {
            href: "/admin",
            label: "Admin",
          },
          ...adminLinks,
        ];
      }

      return adminLinks;
    }

    if (profile?.role === "company") {
      return [
        {
          href: "/dashboard",
          label: "Dashboard",
        },
        {
          href: "/empresa/vagas",
          label: "Vagas",
        },
        {
          href: "/empresa/matches",
          label: "Matches",
        },
        {
          href: "/empresa/talentos",
          label: "Explorar candidatos",
        },
        {
          href: "/empresa/candidatos",
          label: "Candidatos",
        },
        {
          href: "/academia",
          label: "Academia",
        },
      ];
    }

    if (profile?.role === "student") {
      return [
        {
          href: "/dashboard",
          label: "Dashboard",
        },
        {
          href: "/vagas",
          label: "Vagas",
        },
        {
          href: "/dashboard/matches",
          label: "Matches",
        },
        {
          href: "/dashboard/candidaturas",
          label: "Candidaturas",
        },
        {
          href: "/academia",
          label: "Academia",
        },
      ];
    }

    return [
      {
        href: "/dashboard",
        label: "Dashboard",
      },
      {
        href: "/vagas",
        label: "Vagas",
      },
      {
        href: "/academia",
        label: "Academia",
      },
    ];
  }, [isAuthenticated, profile?.role, isAdminUnlocked]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#DDE3EA] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-12">
        <Link href={logoHref} className="flex items-center">
          <Image
            src="/logo-arynqo.png"
            alt="ARYNQO"
            width={320}
            height={80}
            priority
            className="h-auto w-[220px] object-contain md:w-[300px]"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navigationLinks.map((link) => (
            <HeaderLink key={link.href} href={link.href} label={link.label} />
          ))}

          {isAuthenticated && (
            <Link
              href="/dashboard/notificacoes"
              className="relative text-sm font-semibold text-[#07111F]/70 transition hover:text-[#1683FF]"
            >
              Notificações

              {unreadCount > 0 && (
                <span className="absolute -right-5 -top-3 rounded-full bg-[#1683FF] px-2 py-0.5 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {!isAuthenticated && (
            <>
              <Link
                href="/login"
                className="rounded-full border border-[#DDE3EA] px-5 py-2 text-sm font-semibold text-[#07111F] transition hover:border-[#1683FF] hover:text-[#1683FF]"
              >
                Entrar
              </Link>

              <Link
                href="/registo"
                className="rounded-full bg-[#07111F] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
              >
                Criar conta
              </Link>
            </>
          )}

          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-[#DDE3EA] px-5 py-2 text-sm font-semibold text-[#07111F] transition hover:border-[#1683FF] hover:text-[#1683FF]"
            >
              Sair
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          className="rounded-full border border-[#DDE3EA] px-4 py-2 text-sm font-semibold text-[#07111F] md:hidden"
        >
          {isMenuOpen ? "Fechar" : "Menu"}
        </button>
      </div>

      {isMenuOpen && (
        <div className="border-t border-[#DDE3EA] bg-white px-6 py-5 md:hidden">
          <nav className="grid gap-3">
            {navigationLinks.map((link) => (
              <MobileLink
                key={link.href}
                href={link.href}
                label={link.label}
                onClick={closeMenu}
              />
            ))}

            {isAuthenticated && (
              <MobileLink
                href="/dashboard/notificacoes"
                label={
                  unreadCount > 0
                    ? `Notificações (${unreadCount})`
                    : "Notificações"
                }
                onClick={closeMenu}
              />
            )}

            {!isAuthenticated && (
              <>
                <MobileLink href="/login" label="Entrar" onClick={closeMenu} />

                <MobileLink
                  href="/registo"
                  label="Criar conta"
                  onClick={closeMenu}
                  isPrimary
                />
              </>
            )}

            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl border border-[#DDE3EA] px-5 py-3 text-left text-sm font-semibold text-[#07111F] hover:bg-[#F7F9FC]"
              >
                Sair
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function HeaderLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm font-semibold text-[#07111F]/70 transition hover:text-[#1683FF]"
    >
      {label}
    </Link>
  );
}

function MobileLink({
  href,
  label,
  onClick,
  isPrimary = false,
}: {
  href: string;
  label: string;
  onClick: () => void;
  isPrimary?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        isPrimary
          ? "rounded-2xl bg-[#07111F] px-5 py-3 text-sm font-semibold text-white"
          : "rounded-2xl border border-[#DDE3EA] px-5 py-3 text-sm font-semibold text-[#07111F] hover:bg-[#F7F9FC]"
      }
    >
      {label}
    </Link>
  );
}
