import type { SupabaseClient } from "@supabase/supabase-js";

/** Only acknowledge rows returned by the server, never a silent zero-row UPDATE. */
export async function persistNotificationReads(client: SupabaseClient, ids: string[]): Promise<string[]> {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return [];
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError || !sessionData.session) throw new Error("Session required");
  const { data, error } = await client.from("notifications").update({ is_read: true })
    .eq("user_id", sessionData.session.user.id).in("id", uniqueIds).select("id, is_read");
  if (error) throw error;
  const confirmed = (data || []).filter(row => row.is_read === true).map(row => row.id as string);
  if (confirmed.length !== uniqueIds.length || uniqueIds.some(id => !confirmed.includes(id))) {
    throw new Error("Notification read was not confirmed");
  }
  return confirmed;
}

export function notifyNotificationsChanged() {
  window.dispatchEvent(new Event("arynqo-notifications-changed"));
  // Other tabs receive the storage event; blocked storage must not undo a saved read.
  try { window.localStorage.setItem("arynqo-notifications-changed", crypto.randomUUID()); } catch { /* storage unavailable */ }
}
