import {readFileSync,writeFileSync} from 'node:fs';
const locales=['pt','en','fr','es','de','it'];
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function branch(locale,type){const messages=JSON.parse(readFileSync(`lib/i18n/messages/${locale}.json`,'utf8'));const t=source=>escape(messages[source]||source);const prefix=locale==='pt'?'':`/${locale}`;
 const recovery=type==='recovery';const title=recovery?'Recuperar palavra-passe':'Confirma o teu email | ARYNQO';
 const heading=recovery?'Recuperar palavra-passe':'Bem-vindo à ARYNQO.';
 const message=recovery?'Recebemos um pedido para recuperar o acesso à tua conta. Utiliza o botão para definir uma nova palavra-passe.':'Está quase tudo pronto. Confirma o teu endereço de email para concluir o registo e começar a utilizar a tua conta.';
 const action=recovery?'Definir nova palavra-passe':'Confirmar o meu email';
 const url=recovery?'{{ .ConfirmationURL }}':`{{ .SiteURL }}${prefix}/auth/confirm#token_hash={{ .TokenHash }}`;
 return `<!doctype html><html lang="${locale==='pt'?'pt-PT':locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${t(title)}</title></head><body style="margin:0;background:#F7F9FC;font-family:Arial,Helvetica,sans-serif;color:#07111F;"><table role="presentation" width="100%"><tr><td align="center" style="padding:40px 16px"><table role="presentation" width="560" style="width:100%;max-width:560px;background:white;border:1px solid #DDE3EA;border-radius:24px"><tr><td style="padding:36px"><img src="https://www.arynqo.com/logo-arynqo.png" width="160" alt="ARYNQO" style="max-width:100%;height:auto"><h1 style="font-size:28px;line-height:36px">${t(heading)}</h1><p style="font-size:16px;line-height:26px">${t(message)}</p><a href="${url}" style="display:inline-block;background:#1683FF;padding:16px 28px;border-radius:28px;color:white;text-decoration:none;font-weight:bold">${t(action)}</a><p style="font-size:13px;line-height:22px;margin-top:28px">${t('O link é pessoal, tem validade limitada e só pode ser utilizado uma vez.')}</p><p style="font-size:13px;line-height:22px">${t(recovery?'Se não pediste esta alteração, ignora esta mensagem.':'Se não criaste uma conta na ARYNQO, ignora esta mensagem. Não precisas de fazer mais nada.')}</p><div style="border-top:1px solid #DDE3EA;margin-top:28px;padding-top:20px;font-size:12px;line-height:20px">ARYNQO · Where talent evolves<br>${t('Esta é uma mensagem automática relacionada com a tua conta.')}</div></td></tr></table></td></tr></table></body></html>`;
}
for(const type of ['confirmation','recovery']){
 const branches=locales.slice(1).map((locale,index)=>`{{ ${index?'else if':'if'} eq .Data.locale "${locale}" }}\n${branch(locale,type)}`).join('\n');
 writeFileSync(`supabase/templates/${type}.html`,branches+`\n{{ else }}\n${branch('pt',type)}\n{{ end }}\n`);
}
