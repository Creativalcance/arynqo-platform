import { normalizeLocale, type Locale } from "../i18n/config";
import { notificationEmailContent, type NotificationEmail } from "../notification-email";

export type AcademyDelivery = {
  id: string; lease_id: string; kind: "review" | "published";
  post_id: string; recipient_email: string; recipient_name: string | null;
  locale: string; content_locale: string;
  article_title: string; article_excerpt: string; article_slug: string;
};
const copy: Record<Locale, { review: string; reviewBody: string; reviewAction: string; published: string; read: string }> = {
  pt: { review: "Artigo da Academy para aprovação", reviewBody: "O artigo está pronto para revisão. Confirma o conteúdo na área de administração e aprova a publicação. Após a aprovação, será enviado um email aos utilizadores com conta ativa e notificações da Academy ligadas.", reviewAction: "Rever e aprovar artigo", published: "Novo artigo na Academy", read: "Ler artigo" },
  en: { review: "Academy article awaiting approval", reviewBody: "The article is ready for review. Check the content in the admin area and approve publication. Once approved, an email will be sent to active account holders with Academy notifications enabled.", reviewAction: "Review and approve article", published: "New Academy article", read: "Read article" },
  fr: { review: "Article Academy à approuver", reviewBody: "L’article est prêt à être relu. Vérifiez son contenu dans l’administration et approuvez sa publication. Un email sera ensuite envoyé aux utilisateurs dont le compte est actif et les notifications Academy activées.", reviewAction: "Relire et approuver", published: "Nouvel article Academy", read: "Lire l’article" },
  es: { review: "Artículo de Academy pendiente de aprobación", reviewBody: "El artículo está listo para revisar. Comprueba el contenido en el área de administración y aprueba su publicación. Después se enviará un email a los usuarios con cuenta activa y notificaciones de Academy habilitadas.", reviewAction: "Revisar y aprobar", published: "Nuevo artículo en Academy", read: "Leer artículo" },
  de: { review: "Academy-Artikel wartet auf Freigabe", reviewBody: "Der Artikel ist zur Prüfung bereit. Prüfe den Inhalt im Verwaltungsbereich und gib ihn zur Veröffentlichung frei. Danach erhalten aktive Konten mit aktivierten Academy-Benachrichtigungen eine E-Mail.", reviewAction: "Artikel prüfen und freigeben", published: "Neuer Academy-Artikel", read: "Artikel lesen" },
  it: { review: "Articolo Academy da approvare", reviewBody: "L’articolo è pronto per la revisione. Controlla il contenuto nell’area di amministrazione e approva la pubblicazione. Sarà poi inviata un’email agli utenti con account attivo e notifiche Academy abilitate.", reviewAction: "Rivedi e approva", published: "Nuovo articolo Academy", read: "Leggi l’articolo" },
};
export function academyEmailInput(row: AcademyDelivery): NotificationEmail {
  const locale = normalizeLocale(row.locale), text = copy[locale];
  const review = row.kind === "review";
  return {
    locale, actionLocale: review ? locale : normalizeLocale(row.content_locale),
    to: row.recipient_email, name: row.recipient_name,
    title: `${review ? text.review : text.published}: ${row.article_title}`,
    message: review ? `${row.article_excerpt}\n\n${text.reviewBody}` : row.article_excerpt,
    relatedUrl: review ? `/admin/academia?post=${row.post_id}` : `/academia/${encodeURIComponent(row.article_slug)}`,
    actionLabel: review ? text.reviewAction : text.read,
    eventKey: `academy-email/${row.id}`,
  };
}
export type AcademyEmailResult = { outcome: "sent" | "retry" | "failed"; provider?: string; reason?: string };
export async function sendAcademyEmail(row: AcademyDelivery, config: { apiKey: string; from: string; baseUrl: string }, transport: typeof fetch = fetch): Promise<AcademyEmailResult> {
  const input = academyEmailInput(row);
  let content: ReturnType<typeof notificationEmailContent>;
  try { content = notificationEmailContent(input, config.baseUrl); }
  catch { return { outcome: "failed", reason: "invalid_email_configuration" }; }
  try {
    const response = await transport("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": input.eventKey },
      body: JSON.stringify({ from: config.from, to: input.to, subject: `ARYNQO | ${input.title}`, ...content }),
    });
    if (!response.ok) return { outcome: response.status === 429 || response.status >= 500 ? "retry" : "failed", reason: `provider_http_${response.status}` };
    const result = await response.json();
    if (typeof result.id !== "string" || !result.id) return { outcome: "retry", reason: "provider_acceptance_unknown" };
    return { outcome: "sent", provider: result.id };
  } catch { return { outcome: "retry", reason: "provider_acceptance_unknown" }; }
}
