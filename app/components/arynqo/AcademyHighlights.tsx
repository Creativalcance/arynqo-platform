import Link from "@/lib/i18n/link";
import { LText } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
import { readAcademyPosts } from "@/lib/academy/public";

export default async function AcademyHighlights() {
  const locale = await getLocale();
  let posts;
  try {
    posts = await readAcademyPosts(locale, 0, 3);
  } catch {
    console.error("Homepage Academy highlights unavailable");
    return null;
  }
  if (!posts.length) return null;

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map(post => (
        <article key={post.id} className="min-w-0">
          <Link href={`/academia/${post.slug}`} className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-[#F7F9FC] p-6 transition hover:border-blue-400 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:p-8">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
              <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-700"><LText text={post.category} /></span>
              <span className="text-slate-600"><LText text={post.reading_time} /></span>
            </div>
            <h3 className="mt-5 break-words text-2xl font-bold leading-tight tracking-[-0.03em] text-[#07111F] group-hover:text-blue-700">{post.title}</h3>
            <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
            <span className="mt-auto pt-6 text-sm font-semibold text-blue-700"><LText text="Ler artigo →" /></span>
          </Link>
        </article>
      ))}
    </div>
  );
}
