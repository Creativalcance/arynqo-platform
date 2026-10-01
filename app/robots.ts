import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { locales, localizedPath } from "@/lib/i18n/config";
export default function robots(): MetadataRoute.Robots {
 const privatePaths = ["/admin","/dashboard","/empresa","/app","/auth","/definicoes","/login","/registo","/recuperar-acesso"];
 return {rules:{userAgent:"*",allow:"/",disallow:["/api/",...privatePaths.flatMap(path => locales.flatMap(locale => [localizedPath(path,locale)+"$",localizedPath(path,locale)+"/"]))]},sitemap:`${SITE_URL}/sitemap.xml`};
}
