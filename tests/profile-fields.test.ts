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
