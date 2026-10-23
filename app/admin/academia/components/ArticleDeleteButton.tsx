"use client";
import { useRef, useState } from "react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { academyCopy, academyRunMessage } from "@/lib/academy/admin-copy";
import { useI18n } from "@/lib/i18n/client";

type Target = { postId: string; runId?: never } | { runId: string; postId?: never };
export default function ArticleDeleteButton({ postId, runId, title, disabled, onDeleted, onBusyChange }: Target & {
  title: string;
  disabled?: boolean;
  onDeleted: (postId?: string) => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { locale } = useI18n();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  async function remove() {
    if (disabled || inFlight.current) return;
    const confirmation = academyCopy(locale, postId ? "deleteArticleConfirm" : "deleteAttemptConfirm").replace("{title}", title);
    if (!window.confirm(confirmation)) return;
    inFlight.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setMessage("");
    try {
      const response = await authenticatedFetch("/api/admin/academy-automation", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postId ? { post_id: postId } : { run_id: runId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setMessage(academyRunMessage(locale, result.error || "academy_delete_failed"));
        return;
      }
      setMessage(academyCopy(locale, "deleted"));
      await onDeleted(result.post_id ?? postId);
    } catch {
      setMessage(academyCopy(locale, "deleteError"));
    } finally {
      inFlight.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return <div className="space-y-2">
    <button type="button" onClick={() => void remove()} disabled={disabled || busy}
      className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-50">
      {academyCopy(locale, busy ? "deleting" : postId ? "deleteArticle" : "deleteAttempt")}
    </button>
    {message && <p role="status" aria-live="polite" className="break-words text-sm">{message}</p>}
  </div>;
}
