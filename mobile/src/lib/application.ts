import type { SupabaseClient } from "@supabase/supabase-js";

// The server owns validation, default status, deduplication and notifications.
// Never send client-controlled status, user IDs, timestamps or email recipients.
export function sendApplication(
  client: SupabaseClient,
  jobId: string,
  candidateId: string,
) {
  return client
    .from("applications")
    .insert({ job_id: jobId, student_id: candidateId })
    .select("id,status")
    .single();
}
