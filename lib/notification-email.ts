export type NotificationEmail = {
  to: string; name: string | null; title: string; message: string;
  actionLabel?: string | null; relatedUrl?: string | null; eventKey: string;
};
type EmailConfig = { apiKey?: string; from: string; baseUrl: string };
const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

export function notificationEmailContent(input: NotificationEmail, baseUrl: string) {
  const base = new URL(baseUrl);
  if (base.protocol !== "https:") throw new Error("O endereço da plataforma precisa de HTTPS.");
  const action = input.relatedUrl ? new URL(input.relatedUrl, base) : null;
  if (action && (action.origin !== base.origin || action.username || action.password)) throw new Error("Destino do email inválido.");
  const preferences = new URL("/definicoes/notificacoes", base).href;
  const logo = new URL("/logo-arynqo.png", base).href;
  const text = `Olá${input.name ? `, ${input.name}` : ""}.\n\n${input.title}\n\n${input.message}${action ? `\n\n${input.actionLabel || "Abrir na ARYNQO"}: ${action.href}` : ""}\n\nGerir notificações: ${preferences}\nARYNQO · Where talent evolves`;
  const html = `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#F7F9FC;font-family:Arial,Helvetica,sans-serif;color:#07111F;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:40px 16px;"><table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:white;border:1px solid #DDE3EA;border-radius:24px;"><tr><td style="padding:36px;">
<img src="${escape(logo)}" width="160" alt="ARYNQO" style="display:block;width:160px;height:auto;margin-bottom:32px;">
<p style="font-size:12px;letter-spacing:2px;font-weight:bold;color:#1683FF;">A TUA ATIVIDADE NA ARYNQO</p><h1 style="font-size:28px;line-height:36px;letter-spacing:-1px;">${escape(input.title)}</h1>
<p style="font-size:16px;line-height:26px;">Olá${input.name ? `, ${escape(input.name)}` : ""}.</p><p style="font-size:16px;line-height:26px;color:#526174;">${escape(input.message).replaceAll("\n", "<br>")}</p>
${action ? `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:#1683FF;border-radius:28px;"><a href="${escape(action.href)}" style="display:inline-block;padding:16px 28px;color:white;text-decoration:none;font-size:16px;font-weight:bold;">${escape(input.actionLabel || "Abrir na ARYNQO")}</a></td></tr></table>` : ""}
<div style="border-top:1px solid #DDE3EA;margin-top:28px;padding-top:20px;font-size:12px;line-height:20px;color:#526174;">Recebeste esta mensagem porque tens notificações por email ativas na ARYNQO.<br><a href="${escape(preferences)}" style="color:#1683FF;">Gerir preferências de notificação</a><br><br>ARYNQO · Where talent evolves<br>Esta é uma mensagem automática. Consulta os detalhes na plataforma.</div>
</td></tr></table></td></tr></table></body></html>`;
  return { html, text };
}

export async function sendNotificationEmail(input: NotificationEmail, config: EmailConfig, transport: typeof fetch = fetch) {
  if (!config.apiKey) return { sent: false, disabled: true, error: "O envio de emails não está configurado." };
  try {
    const content = notificationEmailContent(input, config.baseUrl);
    const response = await transport("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", "Idempotency-Key": input.eventKey },
      body: JSON.stringify({ from: config.from, to: input.to, subject: `ARYNQO | ${input.title}`, ...content }),
    });
    if (!response.ok) return { sent: false, disabled: false, error: `O serviço de email recusou o envio (HTTP ${response.status}).` };
    const result = await response.json();
    if (typeof result.id !== "string" || !result.id) return { sent: false, disabled: false, error: "O serviço de email não confirmou a aceitação do envio." };
    return { sent: true, disabled: false, error: null };
  } catch { return { sent: false, disabled: false, error: "Não foi possível enviar o email. O serviço está temporariamente indisponível." }; }
}
