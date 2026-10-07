import fs from "node:fs";
const overrides = JSON.parse(fs.readFileSync("scripts/i18n-overrides.json", "utf8"));
const locales = ["pt", "en", "fr", "es", "de", "it"];
const pt = JSON.parse(fs.readFileSync("lib/i18n/messages/pt.json", "utf8"));
for (const source of Object.keys(overrides)) pt[source] ??= source;
pt.remote="Remoto"; pt.hybrid="Híbrido"; pt.presential="Presencial"; pt.full_time="Tempo inteiro"; pt.part_time="Tempo parcial"; pt.internship="Estágio";
pt.Home = "Início"; pt.Skills = "Competências"; pt.Gaps ??= "Aspetos a confirmar";
fs.writeFileSync("lib/i18n/messages/pt.json", JSON.stringify(pt, null, 2) + "\n");
for (const [index, locale] of locales.slice(1).entries()) {
  const file = `lib/i18n/messages/${locale}.json`;
  const messages = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [key, values] of Object.entries(overrides)) messages[key] = values[index];
  // Domain terminology corrections apply only where the Portuguese source refers to recruiting.
  for (const key of Object.keys(messages)) {
    if (/candidatur/i.test(key)) {
      if (locale === "en") messages[key] = messages[key].replace(/candidac(y|ies)/gi, (_, plural) => plural === "ies" ? "applications" : "application");
      if (locale === "fr") messages[key] = messages[key].replace(/\bdemandes\b/gi, "candidatures").replace(/\bdemande\b/gi, "candidature");
      if (locale === "es") messages[key] = messages[key].replace(/\baplicaciones\b/gi, "candidaturas").replace(/\baplicación\b/gi, "candidatura");
      if (locale === "de") messages[key] = messages[key].replace(/\bAnträge\b/g, "Bewerbungen").replace(/\bAntrag\b/g, "Bewerbung").replace(/\bAnwendungen\b/g, "Bewerbungen");
      if (locale === "it") messages[key] = messages[key].replace(/\bapplicazioni\b/gi, "candidature").replace(/\bapplicazione\b/gi, "candidatura");
    }
    if (/\bvagas?\b/i.test(key) && locale === "es") messages[key] = messages[key].replace(/\bvacaciones\b/gi, "ofertas de empleo");
  }
  fs.writeFileSync(file, JSON.stringify(messages, null, 2) + "\n");
}
