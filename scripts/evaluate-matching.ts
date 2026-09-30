import { readFile } from "node:fs/promises";
import { calculateMatch, type StudentProfile, type Job } from "../lib/matching-engine";

// Review labels must come from a human recruiter; never infer them from the score.
type Case = { candidate: StudentProfile; vacancy: Job; suitable: boolean };
async function main() {
  const input = process.argv[2];
  if (!input) throw new Error("Indica o ficheiro JSON de casos avaliados por um recrutador.");
  const cases = JSON.parse(await readFile(input, "utf8")) as Case[];
  if (!Array.isArray(cases) || !cases.length || cases.some(c => !c.candidate || !c.vacancy || typeof c.suitable !== "boolean")) {
    throw new Error("Cada caso precisa de candidate, vacancy e suitable (booleano). Usa dados anonimizados.");
  }
  let recommended = 0, truePositives = 0, falsePositives = 0, suitable = 0, review = 0;
  for (const item of cases) {
    const result = calculateMatch(item.candidate, item.vacancy);
    if (item.suitable) suitable++;
    if (result.matchCategory === "recommended") {
      recommended++;
      if (item.suitable) truePositives++; else falsePositives++;
    } else if (result.isRelevant) review++;
  }
  // Output aggregate diagnostics only, never CV text, contacts or candidate names.
  process.stdout.write(JSON.stringify({ cases: cases.length, recommended, truePositives, falsePositives, review,
    precision: recommended ? truePositives / recommended : null,
    recall: suitable ? truePositives / suitable : null,
    limitation: "Estes resultados dependem das avaliações humanas e da representatividade dos casos; não são probabilidades individuais de contratação."
  }, null, 2) + "\n");
}
main().catch(error => { process.stderr.write((error instanceof Error ? error.message : "Falha na avaliação.") + "\n"); process.exitCode = 1; });
