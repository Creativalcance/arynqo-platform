"use client";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CompanyProfile = {
  id: string;
  company_name: string;
  description: string | null;
  location: string | null;
  website_url: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  industry: string | null;
  company_type: string | null;
  company_size: string | null;
};

type AICompanyResponse = Partial<CompanyProfile> & {
  error?: string;
};

const INDUSTRIES = [
  "Tecnologia",
  "Marketing",
  "Indústria",
  "Saúde",
  "Educação",
  "Construção",
  "Financeiro",
  "Consultoria",
  "Turismo",
  "Hotelaria",
  "Restauração",
  "Recursos Humanos",
  "Logística",
  "Retalho",
  "Automóvel",
  "Energia",
  "Telecomunicações",
  "Outro",
];

const COMPANY_TYPES = [
  "Startup",
  "PME",
  "Grande empresa",
  "Multinacional",
  "Instituição pública",
  "Instituição de ensino",
  "ONG / Associação",
  "Outro",
];

const COMPANY_SIZES = ["1-10", "11-50", "51-250", "251-1000", "1000+"];

export default function PerfilEmpresaPage() {
  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [companySize, setCompanySize] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  async function loadCompanyProfile() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/login";
      return;
    }

    const userId = sessionData.session.user.id;

    const { data, error } = await supabase
      .from("company_profiles")
      .select(
        `
        id,
        company_name,
        description,
        location,
        website_url,
        logo_url,
        contact_email,
        contact_phone,
        address,
        postal_code,
        city,
        country,
        industry,
        company_type,
        company_size
      `
      )
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      alert("Apenas empresas podem editar este perfil.");
      window.location.href = "/dashboard";
      return;
    }

    const profile = data as CompanyProfile;

    setCompanyId(profile.id);
    setCompanyName(profile.company_name || "");
    setDescription(profile.description || "");
    setLocation(profile.location || "");
    setWebsiteUrl(profile.website_url || "");
    setLogoUrl(profile.logo_url || "");
    setContactEmail(profile.contact_email || "");
    setContactPhone(profile.contact_phone || "");
    setAddress(profile.address || "");
    setPostalCode(profile.postal_code || "");
    setCity(profile.city || "");
    setCountry(profile.country || "");
    setIndustry(profile.industry || "");
    setCompanyType(profile.company_type || "");
    setCompanySize(profile.company_size || "");

    setIsEditing(false);
    setIsLoading(false);
  }

  async function handleSave() {
    if (!isEditing || isSaving) {
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("company_profiles")
      .update({
        company_name: companyName,
        description,
        location,
        website_url: websiteUrl,
        logo_url: logoUrl,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        address,
        postal_code: postalCode,
        city,
        country,
        industry,
        company_type: companyType,
        company_size: companySize,
      })
      .eq("id", companyId);

    setIsSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setIsEditing(false);
    setSuccessMessage("Perfil da empresa guardado com sucesso.");

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 4000);
  }

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !isEditing) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Seleciona um ficheiro de imagem válido.");
      return;
    }

    setIsUploadingLogo(true);

    const fileExtension = file.name.split(".").pop();
    const filePath = `${companyId}/logo-${Date.now()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("company-logos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      alert(uploadError.message);
      setIsUploadingLogo(false);
      return;
    }

    const { data } = supabase.storage
      .from("company-logos")
      .getPublicUrl(filePath);

    setLogoUrl(data.publicUrl);
    setIsUploadingLogo(false);
  }

  async function handleAutoFillFromWebsite() {
    if (!isEditing) {
      return;
    }

    if (!websiteUrl.trim()) {
      alert("Introduz primeiro o website da empresa.");
      return;
    }

    setIsAutoFilling(true);

    try {
      const response = await authenticatedFetch("/api/ai/company-scraper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ websiteUrl }),
      });

      const rawText = await response.text();
      let data: AICompanyResponse = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        alert("A IA devolveu uma resposta inválida.");
        setIsAutoFilling(false);
        return;
      }

      if (!response.ok) {
        alert(data.error || "Não foi possível analisar o website.");
        setIsAutoFilling(false);
        return;
      }

      setCompanyName(data.company_name || companyName);
      setDescription(data.description || description);
      setContactEmail(data.contact_email || contactEmail);
      setContactPhone(data.contact_phone || contactPhone);
      setAddress(data.address || address);
      setPostalCode(data.postal_code || postalCode);
      setCity(data.city || city);
      setCountry(data.country || country);
      setLocation(data.location || location);
      setLogoUrl(data.logo_url || logoUrl);
      setIndustry(data.industry || industry);
      setCompanyType(data.company_type || companyType);
      setCompanySize(data.company_size || companySize);

      setSuccessMessage("Dados preenchidos automaticamente. Revê e guarda o perfil.");
    } catch {
      alert("Erro ao analisar website.");
    }

    setIsAutoFilling(false);
  }

  const completedFields = [
    companyName,
    description,
    location,
    websiteUrl,
    logoUrl,
    contactEmail,
    contactPhone,
    address,
    postalCode,
    city,
    country,
    industry,
    companyType,
    companySize,
  ].filter(Boolean).length;

  const profileCompletion = Math.round((completedFields / 14) * 100);

  const inputClass =
    "mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm text-[#07111F] outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

  const textareaClass =
    "mt-2 w-full rounded-2xl border border-[#DDE3EA] bg-white px-4 py-3 text-sm text-[#07111F] outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#1683FF] focus:ring-4 focus:ring-[#1683FF]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <div className="rounded-[32px] border border-white/70 bg-white/80 px-8 py-6 shadow-[0_24px_80px_rgba(7,17,31,0.08)] backdrop-blur">
          <p className="text-sm font-medium text-[#07111F]">
            A carregar perfil da empresa...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-6 py-10 text-[#07111F]">
      <div className="mx-auto max-w-6xl">
        {successMessage && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="space-y-6">
            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)]">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[32px] bg-gradient-to-br from-[#07111F] to-[#1683FF] text-4xl font-semibold text-white shadow-[0_20px_60px_rgba(22,131,255,0.25)]">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={companyName || "Logo da empresa"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    companyName.charAt(0).toUpperCase() || "A"
                  )}
                </div>

                <label
                  className={`mt-5 rounded-full border border-[#DDE3EA] px-5 py-3 text-sm font-semibold transition ${
                    isEditing
                      ? "cursor-pointer hover:border-[#1683FF] hover:text-[#1683FF]"
                      : "cursor-not-allowed opacity-50"
                  }`}
                >
                  {isUploadingLogo ? "A carregar..." : "Carregar logotipo"}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={!isEditing || isUploadingLogo}
                  />
                </label>

                <div className="mt-6">
                  <h2 className="text-2xl font-semibold tracking-[-0.04em]">
                    {companyName || "Nome da empresa"}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {city || location || "Localização da empresa"}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] bg-[#F7F9FC] p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Perfil completo</p>
                  <p className="text-xl font-semibold text-[#1683FF]">
                    {profileCompletion}%
                  </p>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[#1683FF]"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
            </section>
          </aside>

          <div className="space-y-8">
            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                    Perfil da empresa
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                    Informação editável
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {isEditing
                      ? "Edita os dados da empresa ou usa a IA para preencher automaticamente."
                      : "Os campos estão fechados. Clica em Editar para alterar o perfil."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAutoFillFromWebsite}
                  disabled={!isEditing || isAutoFilling}
                  className="rounded-full bg-[#07111F] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#1683FF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAutoFilling
                    ? "A analisar website..."
                    : "✨ Preencher automaticamente com IA"}
                </button>
              </div>

              <div className="grid gap-5">
                <div>
                  <label className="text-sm font-semibold">Website</label>
                  <input
                    value={websiteUrl}
                    onChange={(event) => setWebsiteUrl(event.target.value)}
                    placeholder="https://www.empresa.com"
                    className={inputClass}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Nome da empresa
                  </label>
                  <input
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    required
                    className={inputClass}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Setor de atividade
                  </label>
                  <select
                    value={industry}
                    onChange={(event) => setIndustry(event.target.value)}
                    className={inputClass}
                    disabled={!isEditing}
                  >
                    <option value="">Selecionar setor</option>
                    {INDUSTRIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">Descrição</label>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={8}
                    placeholder="Apresente brevemente a empresa."
                    className={textareaClass}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                Caracterização
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                Tipo e dimensão
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">
                    Tipo de empresa
                  </label>
                  <select
                    value={companyType}
                    onChange={(event) => setCompanyType(event.target.value)}
                    className={inputClass}
                    disabled={!isEditing}
                  >
                    <option value="">Selecionar tipo</option>
                    {COMPANY_TYPES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">
                    Dimensão da empresa
                  </label>
                  <select
                    value={companySize}
                    onChange={(event) => setCompanySize(event.target.value)}
                    className={inputClass}
                    disabled={!isEditing}
                  >
                    <option value="">Selecionar dimensão</option>
                    {COMPANY_SIZES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                Contactos
              </p>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    className={inputClass}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Telefone</label>
                  <input
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                    className={inputClass}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#DDE3EA] bg-white p-6 shadow-[0_24px_80px_rgba(7,17,31,0.06)] md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1683FF]">
                Localização
              </p>

              <div className="mt-6 grid gap-5">
                <div>
                  <label className="text-sm font-semibold">Localização</label>
                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Ex: Coimbra"
                    className={inputClass}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Morada</label>
                  <input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    className={inputClass}
                    disabled={!isEditing}
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-semibold">
                      Código postal
                    </label>
                    <input
                      value={postalCode}
                      onChange={(event) => setPostalCode(event.target.value)}
                      className={inputClass}
                      disabled={!isEditing}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">Cidade</label>
                    <input
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      className={inputClass}
                      disabled={!isEditing}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">País</label>
                    <input
                      value={country}
                      onChange={(event) => setCountry(event.target.value)}
                      className={inputClass}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="sticky bottom-6 z-10 flex justify-end gap-3">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage("");
                    setIsEditing(true);
                  }}
                  className="rounded-full bg-[#07111F] px-8 py-4 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(7,17,31,0.18)] transition hover:-translate-y-0.5 hover:bg-[#1683FF]"
                >
                  Editar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-full bg-[#1683FF] px-8 py-4 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(22,131,255,0.35)] transition hover:-translate-y-0.5 hover:bg-[#07111F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "A guardar..." : "Guardar perfil da empresa"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}