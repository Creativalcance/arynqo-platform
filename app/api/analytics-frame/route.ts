import { analyticsFrameDocument, analyticsPage } from "@/lib/google-analytics";

export function GET(request: Request) {
  const requestedPage = new URL(request.url).searchParams.get("page") ?? "/";
  const page = analyticsPage(requestedPage);
  if (!page) return new Response("Invalid page", { status: 400 });
  return new Response(analyticsFrameDocument(page), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "SAMEORIGIN",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
