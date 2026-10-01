import { headers } from "next/headers";
import { cache } from "react";
import { normalizeLocale, type Locale } from "./config";
import { translator, type Messages } from "./translate";
export const getLocale = cache(async () => normalizeLocale((await headers()).get("x-arynqo-locale")));
export async function getMessages(locale: Locale): Promise<Messages> {
  return (await import(`./messages/${locale}.json`)).default;
}
export const getT = cache(async () => translator(await getMessages(await getLocale())));
