"use client";
import { localizedPath, normalizeLocale, localeCookie } from "@/lib/i18n/config";
import { LText } from "@/lib/i18n/client";


import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "@/lib/i18n/link";

export default function LoginPage({initialNext}:{initialNext:string;initialCompany?:boolean}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [next] = useState(initialNext);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error?.code === 'user_banned') { setMessage("Conta suspensa. Contacta o suporte da ARYNQO."); return; }
      if (error || !data.user) { setMessage("Não foi possível entrar. Confirma o email e a palavra-passe. Se ainda não confirmaste a conta, pede um novo email de confirmação."); return; }
      if (!data.user.email_confirmed_at) { await supabase.auth.signOut(); setMessage("Confirma o teu email antes de iniciares sessão."); return; }
      const { data: profile, error: profileError } = await supabase.from("profiles").select("locale").eq("id", data.user.id).single();
      if (profileError || !profile) { await supabase.auth.signOut(); setMessage("Conta indisponível. Contacta o suporte da ARYNQO."); return; }
      const preferred = normalizeLocale(profile?.locale);
      document.cookie = `${localeCookie}=${preferred}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
      window.location.href = localizedPath(next, preferred);
    } catch { setMessage("Não foi possível ligar ao serviço. Tenta novamente."); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-20">
      <div className="mx-auto max-w-md rounded-[32px] border border-[#DDE3EA] bg-white p-8 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
          <LText text={"ARYNQO"} /></p>

        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#07111F]">
          <LText text={"Entrar"} /></h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          <LText text={next.startsWith("/vagas/") ? "Entra para continuares nesta vaga. Depois de iniciares sessão, regressas à oportunidade que escolheste." : "Acede à tua conta de candidato ou empresa."} />
        </p>

        {message && <p role="alert" className="mt-5 text-sm text-red-700"><LText text={message} /></p>}
        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label htmlFor="login-email" className="text-sm font-semibold text-[#07111F]">
              <LText text={"Email"} /></label>
            <input
              id="login-email" autoComplete="email" type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-[#DDE3EA] px-4 py-3 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="text-sm font-semibold text-[#07111F]">
              <LText text={"Palavra-passe"} /></label>
            <input
              id="login-password" autoComplete="current-password" type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-[#DDE3EA] px-4 py-3 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
            />
          </div>

          <button
            disabled={busy} type="submit"
            className="w-full rounded-full bg-[#07111F] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
          >
            <LText text={busy ? "A entrar…" : "Entrar"} />
          </button>
        </form>
        <Link href="/recuperar-acesso" className="mt-5 block text-center text-sm font-semibold text-blue-700"><LText text={"Esqueceste-te da palavra-passe?"} /></Link>
        <Link href={`/registo${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="mt-4 block text-center text-sm underline"><LText text={"Ainda não tens conta? Criar conta"} /></Link>
        <Link href="/auth/confirm" className="mt-6 block text-center text-sm font-semibold text-[#1683FF]"><LText text={"Precisas de confirmar o email ou pedir um novo link?"} /></Link>
      </div>
    </main>
  );
}
