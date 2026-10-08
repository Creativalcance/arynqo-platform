"use client";
import { browserLocalizedPath } from "@/lib/i18n/config";
import { LText } from "@/lib/i18n/client";


import Link from "@/lib/i18n/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  role: "student" | "company" | "admin";
};

export default function AdminEntryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    async function validateAdminAccess() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!active) return;

    if (!sessionData.session) {
  window.location.href = browserLocalizedPath("/admin/login");
  return;
}

    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", sessionData.session.user.id)
      .single();
    if (!active) return;

    if (error || !profileData) {
      setIsAuthorized(false);
      setIsLoading(false);
      return;
    }

    const profile = profileData as Profile;

    if (profile.role !== "admin") {
      setIsAuthorized(false);
      setIsLoading(false);
      return;
    }

    window.localStorage.setItem("arynqo_admin_unlocked", "true");
    window.dispatchEvent(new Event("arynqo-admin-unlocked"));

    setIsAuthorized(true);
    setIsLoading(false);
  }

    void validateAdminAccess();
    return () => { active = false; };
  }, []);


  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <p className="text-sm text-slate-500"><LText text={"A validar acesso admin..."} /></p>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-6">
        <section className="max-w-xl rounded-[32px] border border-[#DDE3EA] bg-white p-10 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">
            <LText text={"Acesso reservado"} /></p>

          <h1 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[#07111F]">
            <LText text={"Não tens permissões de administrador."} /></h1>

          <p className="mt-4 text-sm leading-6 text-slate-500">
            <LText text={"Esta área está disponível apenas para utilizadores com permissões administrativas."} /></p>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-full bg-[#07111F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
          >
            <LText text={"Voltar ao dashboard"} /></Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-10 text-[#07111F]">
      <div className="mx-auto max-w-5xl">
        <section className="overflow-hidden rounded-[40px] border border-white/70 bg-[#07111F] shadow-[0_30px_100px_rgba(7,17,31,0.18)]">
          <div className="relative px-8 py-10 md:px-12 md:py-14">
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#1683FF]/25 blur-3xl" />
            <div className="absolute bottom-0 right-40 h-48 w-48 rounded-full bg-[#4BB3FD]/15 blur-3xl" />

            <div className="relative">
              <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#4BB3FD] backdrop-blur">
                <LText text={"Admin Arynqo"} /></p>

              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">
                <LText text={"Área de administração."} /></h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                <LText text={"Acesso desbloqueado. A partir de agora, o botão Admin fica disponível no Header deste browser."} /></p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/admin/vagas" className="rounded-full bg-[#1683FF] px-7 py-4 text-sm font-semibold text-white"><LText text="Gerir vagas" /></Link>
                <Link href="/admin/social-agent" className="rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#07111F]">Social Agent</Link>
                <Link href="/admin/vagas-externas" className="rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#07111F]"><LText text="Vagas externas" /></Link>
                <Link href="/admin/competencias" className="rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#07111F]"><LText text={"Catálogo de competências"} /></Link>
                <Link href="/admin/contas" className="rounded-full bg-[#1683FF] px-7 py-4 text-sm font-semibold text-white"><LText text={"Contas e dados"} /></Link>
                <Link
                  href="/admin/academia"
                  className="rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#07111F] transition hover:bg-[#1683FF] hover:text-white"
                >
                  <LText text={"Gerir Academia"} /></Link>

                <Link
                  href="/dashboard"
                  className="rounded-full border border-white/20 px-7 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <LText text={"Voltar ao dashboard"} /></Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}