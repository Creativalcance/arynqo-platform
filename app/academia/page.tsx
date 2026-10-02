import Client from "./AcademiaClient";
import { readAcademyPosts } from "@/lib/academy/public";
import { getLocale } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const locale = await getLocale(),
    params = await searchParams,
    number = Number(params.page || 1);
  const page =
    Number.isInteger(number) && number > 0 && number <= 200 ? number : 1;
  const posts = await readAcademyPosts(locale, (page - 1) * 60, 60);
  return (
    <Client
      key={`${locale}-${page}`}
      initialPosts={posts}
      page={page}
      hasNext={posts.length === 60}
    />
  );
}
