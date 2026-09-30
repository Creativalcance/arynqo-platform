"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ConfirmEmailPage({initialNext}:{initialNext:string}) {
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const submitting = useRef(false);
  const [next] = useState(initialNext);

  async function confirmEmail() {
    if (submitting.current) return;
    const currentUrl = new URL(window.location.href);
    const tokenHash = new URLSearchParams(currentUrl.hash.slice(1)).get("token_hash") || currentUrl.searchParams.get("token_hash");
    submitting.current = true;
    setBusy(true);
    setMessage("");
    try {
      if (!tokenHash) {
        // Compatibility with older ConfirmationURL emails: Auth has already verified
        // the email before redirecting and the existing browser client consumes the session.
        const { data, error } = await supabase.auth.getUser();
        if (!error && data.user?.email_confirmed_at) {
          window.history.replaceState(null, "", "/auth/confirm");
          setConfirmed(true);
        } else setMessage("Este link está incompleto ou expirou. Abre novamente o email ou pede um novo link.");
        return;
      }
      const response = await fetch("/api/auth/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_hash: tokenHash }),
      });
      const result = await response.json();
      if (!response.ok || result.confirmed !== true) { setMessage(result.error || "Não foi possível confirmar o email."); return; }
      window.history.replaceState(null, "", "/auth/confirm");
      setConfirmed(true);
    } catch { setMessage("Não foi possível ligar ao serviço. Verifica a ligação e tenta novamente."); }
    finally { submitting.current = false; setBusy(false); }
  }

  async function resendEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}` } });
      setMessage(error ? "Não foi possível pedir um novo email. Aguarda um pouco e tenta novamente." : "Se existe uma conta por confirmar com este endereço, receberás um novo email. Verifica também a pasta de spam.");
    } catch { setMessage("Não foi possível ligar ao serviço. Tenta novamente dentro de momentos."); }
    finally { submitting.current = false; setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-20">
      <div className="mx-auto max-w-md rounded-[32px] border border-[#DDE3EA] bg-white p-8 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">ARYNQO</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#07111F]">{confirmed ? "Email confirmado." : "Confirma o teu email."}</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">{confirmed ? "A tua conta está pronta. Inicia sessão para continuar o teu percurso na ARYNQO." : "Está quase tudo pronto. Seleciona o botão abaixo para confirmar o teu endereço de email e concluir o registo."}</p>
        {message && <p role="alert" className="mt-5 text-sm leading-6 text-red-700">{message}</p>}
        {!confirmed && <button onClick={confirmEmail} disabled={busy} className="mt-6 w-full rounded-full bg-[#1683FF] px-6 py-4 font-semibold text-white disabled:opacity-60">{busy ? "A processar…" : "Confirmar email"}</button>}
        {!confirmed && <form onSubmit={resendEmail} className="mt-6 border-t border-[#DDE3EA] pt-6">
          <label htmlFor="confirmation-email" className="text-sm font-semibold text-[#07111F]">Precisas de um novo email de confirmação?</label>
          <input id="confirmation-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-3 w-full rounded-xl border border-[#DDE3EA] px-4 py-3" />
          <button disabled={busy} className="mt-3 text-sm font-semibold text-[#1683FF] disabled:opacity-60">Pedir novo email</button>
        </form>}
        <Link href={`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="mt-6 block text-center text-sm font-semibold text-[#07111F]">{confirmed ? "Iniciar sessão" : "Já confirmaste? Inicia sessão"}</Link>
      </div>
    </main>
  );
}
