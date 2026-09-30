export const GOOGLE_ANALYTICS_ID = "G-14YLDZ820X";
export const ANALYTICS_COOKIE_SECONDS = 180 * 24 * 60 * 60;

// Only public content is measured; query strings, fragments and record IDs never enter GA.
export function analyticsPage(pathname: string): string | null {
  if (["/", "/vagas", "/academia", "/politica-de-cookies", "/politica-de-privacidade", "/aviso-legal"].includes(pathname)) return pathname;
  if (/^\/vagas\/[^/]+$/.test(pathname)) return "/vagas/detalhe";
  if (/^\/academia\/[^/]+$/.test(pathname)) return "/academia/artigo";
  return null;
}

export function stopAnalyticsFrame(frame: HTMLIFrameElement) {
  try {
    const target = frame.contentWindow as (Window & Record<string, unknown>) | null;
    if (target) target[`ga-disable-${GOOGLE_ANALYTICS_ID}`] = true;
  } catch { /* The frame may already have been detached. */ }
}

export function clearAnalyticsCookies() {
  document.querySelectorAll<HTMLIFrameElement>('iframe[title="Medição estatística autorizada"]').forEach(stopAnalyticsFrame);
  const domains = ["", ...window.location.hostname.split(".").map((_, i, parts) => parts.slice(i).join(".")).flatMap(domain => [domain, `.${domain}`])];
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (name !== "_ga" && !name.startsWith("_ga_")) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/;${domain ? ` domain=${domain};` : ""} SameSite=Lax`;
    }
  }
}

export function analyticsFrameDocument(page: string): string {
  const location = `https://www.arynqo.com${page}`;
  // A separate, empty document prevents enhanced measurement from inspecting forms,
  // parent history changes, titles or URLs. It is destroyed on withdrawal/private routes.
  return `<!doctype html><html><head><meta name="referrer" content="no-referrer"><style>html,body{min-height:100000px}</style></head><body><script>
window.addEventListener('message', function start(event) {
  if (window.parent === window || event.source !== window.parent || event.origin !== window.location.origin || event.data?.type !== 'arynqo:analytics-authorised') return;
  window.removeEventListener('message', start);
window['ga-disable-${GOOGLE_ANALYTICS_ID}'] = false;
window.dataLayer = [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
gtag('consent', 'update', {analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
gtag('js', new Date());
gtag('config', '${GOOGLE_ANALYTICS_ID}', {send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:${ANALYTICS_COOKIE_SECONDS},cookie_update:false,page_location:${JSON.stringify(location)},page_referrer:'',page_title:${JSON.stringify(`ARYNQO ${page}`)}});
gtag('event','page_view',{page_location:${JSON.stringify(location)},page_referrer:'',page_title:${JSON.stringify(`ARYNQO ${page}`)}});
const script = document.createElement('script');
script.async = true;
script.referrerPolicy = 'no-referrer';
script.src = 'https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}';
document.head.appendChild(script);
});
</script></body></html>`;
}
