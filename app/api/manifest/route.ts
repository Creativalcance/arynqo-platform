import { NextRequest, NextResponse } from "next/server";
import baseManifest from "@/lib/pwa-manifest";
import { localizedPath, normalizeLocale, languageTags } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n/translate";
export async function GET(request: NextRequest) {
 const locale=normalizeLocale(request.nextUrl.searchParams.get("lang"));
 const t=translator(await getMessages(locale));
 return NextResponse.json({...baseManifest(),name:`ARYNQO — ${t("Plataforma internacional de talento")}`,description:t("ARYNQO para candidatos e empresas em todo o mundo."),lang:languageTags[locale],start_url:localizedPath("/app",locale)}, {headers:{"Content-Type":"application/manifest+json","Cache-Control":"public, max-age=3600"}});
}
