"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    return;
  }

  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();

    alert(
      "Ainda não confirmaste o teu email. Verifica a tua caixa de entrada."
    );

    return;
  }

  window.location.href = "/dashboard";
}

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-20">
      <div className="mx-auto max-w-md rounded-[32px] border border-[#DDE3EA] bg-white p-8 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
          ARYNQO
        </p>

        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#07111F]">
          Entrar
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Acede à tua conta de talento ou empresa.
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-semibold text-[#07111F]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-[#DDE3EA] px-4 py-3 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-[#07111F]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-[#DDE3EA] px-4 py-3 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-[#07111F] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
          >
            Entrar
          </button>
        </form>
        <Link href="/auth/confirm" className="mt-6 block text-center text-sm font-semibold text-[#1683FF]">Precisas de confirmar o email ou pedir um novo link?</Link>
      </div>
    </main>
  );
}
