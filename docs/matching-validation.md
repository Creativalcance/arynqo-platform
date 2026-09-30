# Evidence-based matching: validation release

The `evidence-v2` engine is a deterministic compatibility index, not a probability of hiring success. Weights remain product assumptions and are not fitted to recruitment outcomes. This release makes the assumptions explicit and avoids rewarding missing information. No new database migration or external AI request is required.

## Calculation

The existing weights are preserved: skills 35, role 25, seniority 8, location 7, work model 6, salary 5, education/languages 6, opportunity 5 and career stage 3. Each unavailable criterion is excluded from the weighted denominator; its absence is reported separately. Coverage is the sum of weights with usable data, not a statistical confidence interval. Skills use manually declared profile skills and structured skill/tool/soft-skill declarations and the corresponding explicit fields. Career ambitions, headlines, prose experience and AI keywords no longer establish skill evidence.

Mandatory/preferred/specialization subweights are renormalized over the requirements actually specified. Comparisons use explicit aliases or complete phrases, avoiding C/CNC, Java/JavaScript and C++/C# false matches. Aliases are a small reviewed dictionary, not semantic comprehension. Seniority, education and language interpretation remain limited; language presence does not establish fluency or a required certification.

Automatic recommendation requires a score of at least 65, coverage of at least 70, usable role/skill evidence, an identified matching professional family, specified mandatory skills, every mandatory skill evidenced and required language presence. Missing mandatory evidence or unclear/transferrable family limits a score to 64 for review. No mandatory skill evidenced limits the score to 49. An unrelated identified family with weak skills and no role match is not relevant. Unknown families are kept for human review rather than categorically excluded. These gates are provisional product thresholds, not validated recruitment probabilities.

Unknown data has no default positive score. A same-family match without an exact role has a role score of 80, not proof of occupational equivalence. Verified remote model alignment makes distance compatible; any legal residence, travel or geographic remote restriction needs a separate structured requirement. Salary text in ambiguous annual/hourly/foreign-currency form is not compared; numeric salary fields retain the application's existing unit assumptions. Regulated qualifications and licenses are not hard-validated by this release.

The stored explanation includes method version, compatibility and coverage, and lists missing evidence. The existing schema is reused. Displayed results are expressed out of 100. The company frontend no longer applies its own independent family classifier, which previously hid server results inconsistently. Existing stored matches remain unchanged until explicitly recalculated for a candidate/vacancy, and may reflect the previous method. Do not compare old and new rankings as if they came from one model.

## Verification and pilot

Fifteen scenario tests cover strong/partial/unrelated candidates, empty information, missing mandatory requirements, misleading substring matches, aliases, career intentions, unknown families, missing languages, salary punctuation and deterministic bounds across 512 combinations of optional fields. The twelve security tests still pass. These are engineering checks, not an accuracy study against recruiter decisions.

A read-only live aggregate inspection found 5 candidate profiles, including 1 without declared or normalized skills/tools, and 12 active vacancies, including 1 without mandatory skills. No profiles or existing matches were rewritten. These omissions need correction by their owners before the affected pairs can support recommendations.

Use `npm run evaluate:matching -- /absolute/path/recruiter-labelled-cases.json` to evaluate anonymized human-labelled pairs. Each JSON array item has `candidate`, `vacancy` (the engine's input fields) and `suitable` (a human boolean assessment). The command emits aggregate precision, recall, counts and a limitation; it does not contact services or output personal data. Precision is the share of recommendations labelled suitable; recall is the share of suitable pairs recommended. Null means the denominator is empty. The tool does not choose a success target or pretend that synthetic labels establish accuracy.

Before production adoption:

1. Obtain independently reviewed anonymized examples for the actual role families, including suitable and unsuitable profiles, career changes, incomplete CVs and mandatory licenses/languages.
2. Review the disagreement cases, measure recommendation precision and missed suitable candidates, and agree the acceptable tradeoff with the product owner/recruiters.
3. Refine structured requirements and aliases using one development sample; verify on a separate sample not used to adjust rules. Examine results per role family and data completeness.
4. Verify candidate/company browser presentation and authorization, then roll out and recalculate by explicit scope. Preserve evidence of which method produced results and retain human selection decisions.
5. Collect recruiter corrections and subsequent outcomes without treating a rejection or lack of response as automatic proof that a candidate was unsuitable.

No production scoring or public release was performed as part of these local tests. The new code is prepared for review; high match accuracy remains to be established by the labelled pilot.

Validation commands: `npm run test:matching` (15 passed), `npm run test:security` (12 passed), `npx tsc --noEmit --incremental false` (passed), targeted ESLint (passed), full ESLint (32 existing errors/38 warnings; no new diagnostic signatures), synthetic production build (passed). The evaluation CLI was smoke-tested with two synthetic labelled cases only; its output is not evidence of real-world accuracy.

A subsequent read-only shadow pilot evaluated all 60 current candidate/vacancy combinations without changing stored matches. See `matching-shadow-pilot.md`: no automatic recommendations, nine possible matches and four stored recommendations demoted for missing mandatory evidence. Vocabulary ambiguities were found; recruiter labels are still missing. This is a diagnostic of rules and input quality, not proof of accuracy.
