"use client";
import { useRef, useState } from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { academyCopy, academyRunMessage } from "@/lib/academy/admin-copy";
import { useI18n } from "@/lib/i18n/client";

export default function ArticleGenerationButton({ runId, action = "regenerate", disabled, onCompleted, onBusyChange }: {
  runId: string;
  action?: "regenerate" | "retry";
  disabled?: boolean;
  onCompleted: (postId?: string) => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  // Reuse the ID after an ambiguous network failure so a repeated click cannot
  // start a second generation for the same request.
  const requestId = useRef<string | null>(null);
  const inFlight = useRef(false);
  async function generate() {
    if (inFlight.current || disabled) return;
    if (action === "regenerate" && !window.confirm(academyCopy(locale, "regenerateConfirm"))) return;
    inFlight.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setMessage("");
    requestId.current ??= crypto.randomUUID();
    try {
      const response = await authenticatedFetch("/api/admin/academy-automation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, run_id: runId, request_id: requestId.current }),
      });
      const result = await response.json();
      if ((result.run_id || result.skipped) && result.reason !== "already_running") requestId.current = null;
      setMessage(!response.ok
        ? academyRunMessage(locale, result.error || academyCopy(locale, "error"))
        : result.skipped
          ? academyRunMessage(locale, result.reason)
          : academyCopy(locale, "held"));
      await onCompleted(response.ok ? result.post_id : undefined);
    } catch {
      setMessage(academyCopy(locale, "generationConnectionError"));
    } finally {
      inFlight.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return <div className="space-y-2">
    <button type="button" disabled={disabled || busy} onClick={() => void generate()}
      className="rounded-xl border border-blue-600 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
      {busy ? academyCopy(locale, "generatingAgain") : academyCopy(locale, action === "regenerate" ? "regenerate" : "retry")}
    </button>
    {message && <p role="status" aria-live="polite" className="break-words text-sm">{message}</p>}
  </div>;
}
