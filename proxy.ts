import { NextResponse, type NextRequest } from "next/server";
import { localizedPath, pathLocale, stripLocale, normalizeLocale, localeCookie } from "./lib/i18n/config";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const explicit = pathLocale(path);
  const locale = explicit || "pt";
  const clean = stripLocale(path);
  // Never reinterpret API endpoints or static assets as translated pages.
  if (explicit && (/^\/(api|_next)(\/|$)/.test(clean) || /\.[a-z0-9]+$/i.test(clean))) return new NextResponse(null, { status: 404 });
  if (explicit === "pt") return NextResponse.redirect(new URL(clean + request.nextUrl.search, request.url), 308);
  const preferred = normalizeLocale(request.cookies.get(localeCookie)?.value);
  const privateRoute = clean.startsWith("/vagas/externas/") || /^\/(dashboard|empresa|admin|app|definicoes)(\/|$)/.test(clean);
  if (!explicit && preferred !== "pt" && privateRoute) return NextResponse.redirect(new URL(localizedPath(path, preferred) + request.nextUrl.search, request.url));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-arynqo-locale", locale);
  requestHeaders.set("x-arynqo-path", clean);
  const response = explicit ? NextResponse.rewrite(new URL(clean + request.nextUrl.search, request.url), { request: { headers: requestHeaders } }) : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Language", locale === "pt" ? "pt-PT" : locale);
  if (privateRoute || /^\/(auth|login|registo|recuperar-acesso)(\/|$)/.test(clean)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  return response;
}
export const config = { matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico|js|css|woff|woff2)$).*)"] };
