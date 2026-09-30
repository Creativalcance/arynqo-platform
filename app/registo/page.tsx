"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type AccountType = "talent" | "company";

type TalentType = "student" | "graduate" | "professional" | "career_change";

export default function RegistoPage() {
  const [accountType, setAccountType] = useState<AccountType>("talent");
  const [talentType, setTalentType] = useState<TalentType>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const role = accountType === "company" ? "company" : "student";

    const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/confirm`,
    data: {
      role,
      name,
      talent_type: accountType === "talent" ? talentType : null,
    },
  },
});

    if (error) {
      alert(error.message);
      return;
    }

    alert("Conta criada com sucesso. Confirma o teu email antes de iniciares sessão.");
window.location.href = "/login";
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

        <form onSubmit={handleRegister} className="mt-8 space-y-5">
          <div>
            <label className="text-sm font-semibold text-[#07111F]">
              Tipo de conta
            </label>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType("talent")}
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
                onClick={() => setAccountType("company")}
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
              <label className="text-sm font-semibold text-[#07111F]">
                Perfil de talento
              </label>

              <select
                value={talentType}
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
            <label className="text-sm font-semibold text-[#07111F]">
              {accountType === "company" ? "Nome da empresa" : "Nome"}
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="mt-2 w-full rounded-2xl border border-[#DDE3EA] px-4 py-3 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
            />
          </div>

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
              minLength={6}
              className="mt-2 w-full rounded-2xl border border-[#DDE3EA] px-4 py-3 text-sm outline-none transition focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-[#07111F] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1683FF]"
          >
            Criar conta
          </button>
        </form>
      </div>
    </main>
  );
}
