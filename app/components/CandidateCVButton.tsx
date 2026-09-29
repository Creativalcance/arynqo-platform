"use client";
import { useState } from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

export function CandidateCVButton({ studentId, className }: { studentId: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setBusy(true); setError("");
    try {
      const response = await authenticatedFetch(`/api/candidates/${studentId}/cv`);
      if (!response.ok) { const body = await response.json(); throw new Error(body.error || "Não foi possível obter o currículo."); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = blob.type === "application/pdf" ? "curriculo.pdf" : "curriculo.docx";
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível obter o currículo."); }
    finally { setBusy(false); }
  }
  return <div><button type="button" disabled={busy} onClick={download} className={className}>{busy ? "A obter currículo…" : "Ver CV"}</button>{error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>;
}
