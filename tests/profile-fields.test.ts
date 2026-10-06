import assert from "node:assert/strict";
import { test } from "node:test";
import { countryOptions, languageOptions, languageCompatibility } from "../lib/profile-options";
import { safeWritingDraft, hasWritingContent } from "../lib/profile-writing";
test("language catalog and countries have stable unique codes", () => {
  assert.equal(countryOptions.length,249); assert.ok(languageOptions.length > 8000);
  assert.equal(new Set(languageOptions.map(o => o.code)).size, languageOptions.length);
  assert.ok(countryOptions.some(o => o.code === "PT"));
});
test("matching aligns Portuguese and English labels and evaluates CEFR levels", () => {
  assert.equal(languageCompatibility(["Inglês (C2)"],["English (C1)"]).score,100);
  assert.equal(languageCompatibility(["Inglês (B2)"],["English (C1)"]).score,0);
  assert.equal(languageCompatibility(["Inglês"],["English (C1)"]).score,0);
  assert.equal(languageCompatibility(["Português (Nativo)"],["Portuguese (C2)"]).score,100);
});
test("written proficiency cannot prove spoken proficiency", () => {
  assert.equal(languageCompatibility(["Escrito: Inglês (C2)"],["Falado: Inglês (C1)"]).score,0);
  assert.equal(languageCompatibility(["Falado: Inglês (C2)"],["Falado: Inglês (C1)"]).score,100);
});
test("writing cannot change classifications, scores, numbers or fill empty fields", () => {
  const draft = safeWritingDraft({bio:"Trabalho há 5 anos.",headline:"",career_goals:"Aprender.",ai_summary:"Resumo.",seniority:"junior"}, {bio:"Trabalho há 10 anos.",headline:"Diretor",career_goals:"Pretendo aprender.",ai_summary:"Resumo melhorado.",seniority:"senior",skills:["Python"],ai_profile_score:100});
  assert.equal(draft.bio,"Trabalho há 5 anos."); assert.equal(draft.headline,""); assert.equal(draft.career_goals,"Pretendo aprender.");
  assert.equal("seniority" in draft,false); assert.equal("skills" in draft,false); assert.equal("ai_profile_score" in draft,false);
});

test("writing review requires actual text, not an uploaded file or classifications", () => {
  assert.equal(hasWritingContent({ cv_url: "cv.pdf", main_role: "Student", bio: "  " }), false);
  assert.equal(hasWritingContent({ headline: 42 }), false);
  assert.equal(hasWritingContent({ bio: "Tenho experiência em vendas." }), true);
  assert.equal(hasWritingContent({ headline: "", bio: "", career_goals: "", ai_summary: "" }), false);
});

test("country-assisted language choices preserve language, level and channel matching", async () => {
  const {countryFlag,languageCodesForCountry,selectProfileLanguage}=await import('../lib/language-selection');
  assert.equal(countryFlag('PT'),'🇵🇹');
  assert.ok(languageCodesForCountry('PT').includes('pt'));
  assert.ok(languageCodesForCountry('BR').includes('pt'));
  assert.ok(languageCodesForCountry('CH').includes('de'));
  assert.ok(languageCodesForCountry('CH').includes('fr'));
  assert.ok(languageCodesForCountry('CH').includes('it'));
  const candidate=selectProfileLanguage(['Idioma antigo (B1)'],'pt','C1');
  assert.equal(candidate[0],'Idioma antigo (B1)');
  const updated=selectProfileLanguage(candidate,'pt','B2');
  assert.equal(updated.length,2);
  assert.equal(languageCompatibility(updated,selectProfileLanguage([],'pt','C1')).score,0);
  assert.equal(languageCompatibility(updated,selectProfileLanguage([],'pt','B2')).score,100);
  assert.equal(languageCompatibility(updated.map(v=>'Escrito: '+v),['Falado: Português (B2)']).score,0);
  assert.equal(selectProfileLanguage(updated,'invalid-country','C2'),updated);
  for(const country of countryOptions) for(const code of languageCodesForCountry(country.code)) assert.ok(languageOptions.some(language=>language.code===code));
});
