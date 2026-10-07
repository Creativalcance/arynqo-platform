import { after } from 'next/server';
import { processWelcomeEmails } from './welcome-email-worker';

export function scheduleWelcomeEmail(userId: string) {
  try {
    after(async () => {
      try { await processWelcomeEmails({ userId }); }
      catch { console.error('welcome_email_worker_failed'); }
    });
  } catch {
    // Activation remains successful. The durable queue is also drained by cron.
    console.error('welcome_email_scheduling_failed');
  }
}
