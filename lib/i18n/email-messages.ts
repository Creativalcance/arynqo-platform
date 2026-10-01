import pt from "./messages/pt.json";
import en from "./messages/en.json";
import fr from "./messages/fr.json";
import es from "./messages/es.json";
import de from "./messages/de.json";
import it from "./messages/it.json";
import { translator } from "./translate";
import type { Locale } from "./config";
const catalogs = { pt, en, fr, es, de, it };
const translators = new Map<Locale, ReturnType<typeof translator>>();
export function emailTranslator(locale: Locale) {
  if (!translators.has(locale)) translators.set(locale, translator(catalogs[locale]));
  return translators.get(locale)!;
}
