import languageData from "./data/languages.json";
import countryCodes from "./data/countries.json";

export const optionKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const languageNames = new Intl.DisplayNames(["pt-PT"], { type: "language" });
const regionNames = new Intl.DisplayNames(["pt-PT"], { type: "region" });
export const languageOptions = languageData.map(([code, english]) => {
  const translated = languageNames.of(code);
  return { code, label: translated && translated !== code ? translated : english, english };
}).sort((a, b) => a.label.localeCompare(b.label, "pt-PT"));
export const countryOptions = countryCodes.map(code => ({ code, label: regionNames.of(code) || code })).sort((a, b) => a.label.localeCompare(b.label, "pt-PT"));
const languageIds = new Map<string, string>();
for (const option of languageOptions) for (const name of [option.code, option.label, option.english]) languageIds.set(optionKey(name), option.code);
for (const locale of ["en","fr","es","de","it"]) { const names=new Intl.DisplayNames([locale],{type:"language"}); for (const option of languageOptions) {const label=names.of(option.code);if(label && label!==option.code) languageIds.set(optionKey(label),option.code);} }
export const languageLevels = ["A1", "A2", "B1", "B2", "C1", "C2", "Nativo"] as const;
export const splitTags = (value: string) => value.split(/[,;\n]+/).map(v => v.trim()).filter(Boolean);
export function parseLanguage(value: string) {
  const channel = value.match(/^(Falado|Escrito):\s*/i);
  value = channel ? value.slice(channel[0].length) : value;
  const level = value.match(/\s*\((A1|A2|B1|B2|C1|C2|Nativo|Native)\)\s*$/i);
  const name = level ? value.slice(0, level.index).trim() : value.trim();
  const code = languageIds.get(optionKey(name)) || optionKey(name);
  return { code, name, channel: channel ? channel[1].toLowerCase() : "", level: level ? (/native|nativo/i.test(level[1]) ? "Nativo" : level[1].toUpperCase()) : "" };
}
export function languageCompatibility(candidate: string[], requirements: string[]) {
  const have = candidate.flatMap(splitTags).map(parseLanguage);
  const need = requirements.flatMap(splitTags).map(parseLanguage);
  const rank = (level: string) => languageLevels.indexOf(level as typeof languageLevels[number]);
  const satisfied = need.filter(required => have.some(actual => actual.code === required.code && (!required.channel || actual.channel === required.channel) && (!required.level || (actual.level !== "" && rank(actual.level) >= rank(required.level)))));
  return { known: have.length > 0 && need.length > 0, count: need.length, score: need.length ? Math.round(100 * satisfied.length / need.length) : 0 };
}

const localizedOptions = new Map<string, { countries: { code: string; label: string; display: string }[]; languages: { code: string; label: string; display: string; english: string }[] }>();
export function profileOptions(locale: string) {
  const cached = localizedOptions.get(locale); if (cached) return cached;
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const languages = new Intl.DisplayNames([locale], { type: "language" });
  const result = {
    countries: countryOptions.map(option => ({ ...option, display: regions.of(option.code) || option.label })).sort((a,b) => a.display.localeCompare(b.display, locale)),
    languages: languageOptions.map(option => { const name = languages.of(option.code); return { ...option, display: name && name !== option.code ? name : option.english }; }).sort((a,b) => a.display.localeCompare(b.display, locale)),
  };
  localizedOptions.set(locale, result); return result;
}
