"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type AccountType = "talent" | "company";

type TalentType = "student" | "graduate" | "professional" | "career_change";

export default function RegistoPage({initialNext, initialCompany = false}:{initialNext:string;initialCompany?:boolean}) {
  const [accountType, setAccountType] = useState<AccountType>(initialCompany ? "company" : "talent");
  const [talentType, setTalentType] = useState<TalentType>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [next] = useState(initialNext);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(busy) return;
    setBusy(true); setMessage("");
    try {

    const role = accountType === "company" ? "company" : "student";

    const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
    data: {
      role,
      name,
      talent_type: accountType === "talent" ? talentType : null,
    },
  },
});

    if (error) { setMessage("Não foi possível criar a conta. Confirma os dados ou tenta recuperar o acesso se já tens conta."); return; }
    setCreated(true);
    setMessage("Verifica o teu email para confirmar a conta. Consulta também a pasta de spam.");
    } catch { setMessage("Não foi possível ligar ao serviço. Tenta novamente."); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-20">
      <div className="mx-auto max-w-xl rounded-[32px] border border-[#DDE3EA] bg-white p-8 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
          ARYNQO
        </p>

        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#07111F]">
          Criar conta
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Cria uma conta como talento ou empresa.
        </p>

        {message && <p role="status" className="mt-5 text-sm text-slate-700">{message}</p>}
        {!created && <form onSubmit={handleRegister} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-semibold text-[#07111F]">
              Tipo de conta
            </label>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={accountType === "talent"} onClick={() => setAccountType("talent")}
                className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
                  accountType === "talent"
                    ? "border-[#1683FF] bg-[#1683FF] text-white"
                    : "border-[#DDE3EA] bg-white text-[#07111F] hover:border-[#1683FF]"
                }`}
              >
                Talento
              </button>

              <button
                type="button"
                aria-pressed={accountType === "company"} onClick={() => setAccountType("company")}
                className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
                  accountType === "company"
                    ? "border-[#1683FF] bg-[#1683FF] text-white"
                    : "border-[#DDE3EA] bg-white text-[#07111F] hover:border-[#1683FF]"
                }`}
              >
                Empresa
              </button>
            </div>
          </div>

          {accountType === "talent" && (
            <div>
              <label htmlFor="talent-type" className="text-sm font-semibold text-[#07111F]">
                Perfil de talento
              </label>

              <select
                id="talent-type" value={talentType}
                onChange={(event) =>
                  setTalentType(event.target.value as TalentType)
                }
                className="mt-2 w-full rounded-2xl border border-[#DDE3EA] px-4 py-3 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
              >
                <option value="student">Estudante</option>
                <option value="graduate">Recém-licenciado</option>
                <option value="professional">Profissional</option>
                <option value="career_change">Em transição de carreira</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="register-name" className="text-sm font-semibold text-[#07111F]">
              {accountType === "company" ? "Nome da empresa" : "Nome"}
            </label>

            <input
              id="register-name" autoComplete={accountType === "company" ? "organization" : "name"} value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-[#DDE3EA] px-4 py-3 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
            />
          </div>

          <div>
            <label htmlFor="register-email" className="text-sm font-semibold text-[#07111F]">
              Email
            </label>

            <input
              id="register-email" autoComplete="email" type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-[#DDE3EA] px-4 py-3 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
            />
          </div>

          <div>
            <label htmlFor="register-password" className="text-sm font-semibold text-[#07111F]">
              Palavra-passe
            </label>

            <input
              id="register-password" autoComplete="new-password" aria-describedby="password-help" type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="mt-2 w-full rounded-2xl border border-[#DDE3EA] px-4 py-3 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
            />
          </div>

          <p id="password-help" className="text-sm text-slate-600">Usa pelo menos 6 caracteres. Prefere uma palavra-passe longa e exclusiva.</p>
          <button
            disabled={busy} type="submit"
            className="w-full rounded-full bg-[#07111F] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
          >
            {busy ? "A criar conta…" : "Criar conta"}
          </button>
          <p className="text-sm leading-6 text-slate-600">Consulta as <Link href="/aviso-legal" className="underline">condições de utilização</Link> e a <Link href="/politica-de-privacidade" className="underline">Política de Privacidade</Link>. Criar conta não subscreve comunicações promocionais.</p>
        </form>}
        <Link href={`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="mt-6 block text-sm underline">Já tens conta? Entrar</Link>
      </div>
    </main>
  );
}
