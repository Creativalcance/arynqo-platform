import { isLocale, languageTags, localizedPath, normalizeLocale, type Locale } from './i18n/config';

type Article = { title: string; excerpt: string; slug: string; locale: Locale };
export type WelcomeDelivery = {
  id: string; lease_id: string; user_id: string;
  recipient_email: string; recipient_name: string | null; locale: string; article: unknown;
};
type EmailConfig = { apiKey: string; from: string; baseUrl: string };
export type WelcomeEmailResult = { outcome: 'sent' | 'retry' | 'failed'; provider?: string; reason?: string };
const copy: Record<Locale, { subject: string; hello: string; intro: string; login: string; academy: string; articleIntro: string; read: string; footer: string }> = {
  pt: { subject: 'Bem-vindo à ARYNQO', hello: 'Olá', intro: 'Dou-te as boas-vindas à ARYNQO. A tua conta já está ativa e podes começar a preparar o teu perfil.', login: 'Entrar na minha conta', academy: 'O último artigo da Academy', articleIntro: 'Para te ajudar a começar, partilho contigo o artigo mais recente da Academy.', read: 'Ler artigo', footer: 'Envio-te esta mensagem porque acabaste de ativar a tua conta na ARYNQO.' },
  en: { subject: 'Welcome to ARYNQO', hello: 'Hi', intro: 'Welcome to ARYNQO. Your account is now active and you can start setting up your profile.', login: 'Log in to my account', academy: 'The latest Academy article', articleIntro: 'To help you get started, here is the latest Academy article.', read: 'Read article', footer: 'You received this message because you just activated your ARYNQO account.' },
  fr: { subject: 'Bienvenue sur ARYNQO', hello: 'Bonjour', intro: 'Bienvenue sur ARYNQO. Ton compte est maintenant actif et tu peux commencer à préparer ton profil.', login: 'Me connecter', academy: 'Le dernier article de l’Academy', articleIntro: 'Pour t’aider à démarrer, je partage avec toi le dernier article de l’Academy.', read: 'Lire l’article', footer: 'Tu reçois ce message parce que tu viens d’activer ton compte ARYNQO.' },
  es: { subject: 'Bienvenido a ARYNQO', hello: 'Hola', intro: 'Te doy la bienvenida a ARYNQO. Tu cuenta ya está activa y puedes empezar a preparar tu perfil.', login: 'Entrar en mi cuenta', academy: 'El último artículo de Academy', articleIntro: 'Para ayudarte a empezar, comparto contigo el último artículo de Academy.', read: 'Leer artículo', footer: 'Recibes este mensaje porque acabas de activar tu cuenta de ARYNQO.' },
  de: { subject: 'Willkommen bei ARYNQO', hello: 'Hallo', intro: 'Willkommen bei ARYNQO. Dein Konto ist jetzt aktiv und du kannst dein Profil einrichten.', login: 'Bei meinem Konto anmelden', academy: 'Der neueste Academy-Artikel', articleIntro: 'Damit du gut starten kannst, teile ich den neuesten Academy-Artikel mit dir.', read: 'Artikel lesen', footer: 'Du erhältst diese Nachricht, weil du gerade dein ARYNQO-Konto aktiviert hast.' },
  it: { subject: 'Benvenuto su ARYNQO', hello: 'Ciao', intro: 'Ti do il benvenuto su ARYNQO. Il tuo account è attivo e puoi iniziare a preparare il tuo profilo.', login: 'Accedi al mio account', academy: 'L’ultimo articolo di Academy', articleIntro: 'Per aiutarti a iniziare, condivido con te l’ultimo articolo di Academy.', read: 'Leggi l’articolo', footer: 'Ricevi questo messaggio perché hai appena attivato il tuo account ARYNQO.' },
};
const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
function validArticle(value: unknown): Article | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (typeof row.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) || row.slug.length > 160) return null;
  if (!isLocale(row.locale) || typeof row.title !== 'string' || !row.title.trim()) return null;
  return { title: row.title.slice(0, 240), excerpt: typeof row.excerpt === 'string' ? row.excerpt.slice(0, 600) : '', slug: row.slug, locale: row.locale };
}

export function welcomeEmailContent(row: WelcomeDelivery, baseUrl: string) {
  const locale = normalizeLocale(row.locale), text = copy[locale], article = validArticle(row.article);
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password) throw new Error('invalid_email_configuration');
  const login = new URL(localizedPath('/login', locale), base).href;
  const articleUrl = article ? new URL(localizedPath(`/academia/${article.slug}`, article.locale), base).href : null;
  const hello = `${text.hello}${row.recipient_name ? `, ${row.recipient_name.slice(0, 160)}` : ''}.`;
  const html = `<!doctype html><html lang="${languageTags[locale]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#F7F9FC;font-family:Arial,Helvetica,sans-serif;color:#07111F"><table role="presentation" width="100%"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="560" style="width:100%;max-width:560px;background:white;border:1px solid #DDE3EA;border-radius:24px"><tr><td style="padding:36px"><img src="${escape(new URL('/logo-arynqo.png', base).href)}" width="160" alt="ARYNQO" style="max-width:100%;height:auto"><h1 style="font-size:28px;line-height:36px">${escape(text.subject)}</h1><p style="font-size:16px;line-height:26px">${escape(hello)}</p><p style="font-size:16px;line-height:26px">${escape(text.intro)}</p><a href="${escape(login)}" style="display:inline-block;background:#1683FF;padding:16px 28px;border-radius:28px;color:white;text-decoration:none;font-weight:bold">${escape(text.login)}</a>${article && articleUrl ? `<div style="border-top:1px solid #DDE3EA;margin-top:28px;padding-top:24px"><p style="font-size:12px;font-weight:bold;color:#1683FF">${escape(text.academy)}</p><p style="font-size:14px;line-height:22px">${escape(text.articleIntro)}</p><h2 style="font-size:21px;line-height:28px">${escape(article.title)}</h2><p style="font-size:15px;line-height:24px">${escape(article.excerpt)}</p><a href="${escape(articleUrl)}" style="display:inline-block;border:1px solid #1683FF;padding:12px 22px;border-radius:24px;color:#1683FF;text-decoration:none;font-weight:bold">${escape(text.read)}</a></div>` : ''}<div style="border-top:1px solid #DDE3EA;margin-top:28px;padding-top:20px;font-size:12px;line-height:20px">${escape(text.footer)}<br><br>ARYNQO · Where talent evolves</div></td></tr></table></td></tr></table></body></html>`;
  return { subject: `${text.subject} | ARYNQO`, html, text: `${hello}\n\n${text.intro}\n\n${text.login}: ${login}${article ? `\n\n${text.academy}\n${text.articleIntro}\n\n${article.title}\n${article.excerpt}\n${text.read}: ${articleUrl}` : ''}\n\n${text.footer}\nARYNQO · Where talent evolves` };
}

export async function sendWelcomeEmail(row: WelcomeDelivery, config: EmailConfig, transport: typeof fetch = fetch): Promise<WelcomeEmailResult> {
  let content: ReturnType<typeof welcomeEmailContent>;
  try { content = welcomeEmailContent(row, config.baseUrl); }
  catch { return { outcome: 'failed', reason: 'invalid_email_configuration' }; }
  try {
    const response = await transport('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `welcome-email/${row.id}` },
      body: JSON.stringify({ from: config.from, to: row.recipient_email, ...content }),
    });
    if (!response.ok) return { outcome: response.status === 429 || response.status >= 500 ? 'retry' : 'failed', reason: `provider_http_${response.status}` };
    const result = await response.json();
    if (typeof result.id !== 'string' || !result.id) return { outcome: 'retry', reason: 'provider_acceptance_unknown' };
    return { outcome: 'sent', provider: result.id };
  } catch { return { outcome: 'retry', reason: 'provider_acceptance_unknown' }; }
}
