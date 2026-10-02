import { NextRequest, NextResponse } from "next/server";
import { readAcademyPost, readAcademyPosts } from "@/lib/academy/public";
import { normalizeLocale } from "@/lib/i18n/config";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams,
    locale = normalizeLocale(params.get("locale"));
  try {
    const slug = params.get("slug");
    if (slug) {
      const post = await readAcademyPost(slug, locale);
      return NextResponse.json({ post }, { status: post ? 200 : 404 });
    }
    const parsed = Number(params.get("offset") || 0);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10000)
      return NextResponse.json({ error: "Invalid offset" }, { status: 400 });
    return NextResponse.json({
      posts: await readAcademyPosts(locale, parsed, 60),
    });
  } catch {
    return NextResponse.json({ error: "Academy unavailable" }, { status: 503 });
  }
}
