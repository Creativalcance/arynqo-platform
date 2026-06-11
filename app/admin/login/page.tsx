"use client";

import Image from "next/image";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  role: "student" | "company" | "admin";
};

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      alert("Introduz o email e a palavra-passe.");
      return;
    }

    setIsLoading(true);

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (authError || !authData.session) {
      alert(authError?.message || "Não foi possível iniciar sessão.");
      setIsLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.session.user.id)
      .single();

    if (profileError || !profileData) {
      await supabase.auth.signOut();
      alert("Perfil não encontrado.");
      setIsLoading(false);
      return;
    }

    const profile = profileData as Profile;

    if (profile.role !== "admin") {
      await supabase.auth.signOut();
      alert("Este acesso é reservado a administradores.");
      setIsLoading(false);
      return;
    }

    window.localStorage.setItem("arynqo_admin_unlocked", "true");
    window.dispatchEvent(new Event("arynqo-admin-unlocked"));

    window.location.href = "/admin";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-6 py-12 text-[#07111F]">
      <section className="w-full max-w-md rounded-[36px] border border-[#DDE3EA] bg-white p-8 shadow-[0_24px_80px_rgba(7,17,31,0.08)]">
        <div className="flex justify-center">
          <Image
            src="/logo-arynqo.png"
            alt="ARYNQO"
            width={260}
            height={80}
            priority
            className="h-auto w-[220px] object-contain"
          />
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1683FF]">
            Admin
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-[-0.05em]">
            Acesso reservado.
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Entra com o email e palavra-passe de administrador para desbloquear
            a área de gestão da ARYNQO.
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 grid gap-5">
          <div>
            <label className="text-sm font-semibold">Email</label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@arynqo.com"
              className="mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm text-[#07111F] outline-none transition placeholder:text-slate-400 focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Palavra-passe</label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm text-[#07111F] outline-none transition placeholder:text-slate-400 focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-full bg-[#07111F] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1683FF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "A validar..." : "Entrar como admin"}
          </button>
        </form>
      </section>
    </main>
  );
}