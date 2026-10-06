import { after } from "next/server";
import { processAcademyEmails } from "./email-worker";
export function scheduleAcademyEmails() {
  after(async () => {
    try { await processAcademyEmails(); }
    catch { console.error("academy_email_worker_failed"); }
  });
}
