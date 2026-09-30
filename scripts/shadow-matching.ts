import { readFile } from "node:fs/promises";
import { calculateMatch, type StudentProfile, type Job } from "../lib/matching-engine";

type Previous = { candidate: string; vacancy: string; match_score: number; match_category: string };
type Input = { candidates: StudentProfile[]; jobs: Job[]; previous: Previous[] };
async function main() {
  const filename = process.argv[2];
  if (!filename) throw new Error("Indica o ficheiro JSON do ensaio com dados pseudonimizados.");
  const input = JSON.parse(await readFile(filename, "utf8")) as Input;
  if (!Array.isArray(input.candidates) || !Array.isArray(input.jobs) || !Array.isArray(input.previous)
    || input.candidates.some(c => !/^C\d+$/.test(c.id)) || input.jobs.some(j => !/^V\d+$/.test(j.id))) {
    throw new Error("São necessárias listas candidates/jobs/previous com identificadores C1… e V1…, sem contactos ou referências a documentos.");
  }
  const baseline = new Map(input.previous.map(row => [`${row.candidate}:${row.vacancy}`, row]));
  const categories: Record<string, number> = {};
  const transitions: Record<string, number> = {};
  let pairs = 0, comparable = 0, scoreSum = 0, deltaSum = 0, coverageBelow70 = 0, missingRequired = 0;
  for (const candidate of input.candidates) for (const job of input.jobs) {
    const result = calculateMatch(candidate, job);
    pairs++; scoreSum += result.matchScore;
    categories[result.matchCategory] = (categories[result.matchCategory] || 0) + 1;
    const coverage = Number(result.aiReason.match(/Cobertura de informação: (\d+)/)?.[1]);
    if (coverage < 70) coverageBelow70++;
    if (result.missingSkills.length) missingRequired++;
    const old = baseline.get(`${candidate.id}:${job.id}`);
    if (old) {
      comparable++; deltaSum += result.matchScore - old.match_score;
      const transition = `${old.match_category} → ${result.matchCategory}`;
      transitions[transition] = (transitions[transition] || 0) + 1;
    }
  }
  const round = (v: number) => Math.round(v * 10) / 10;
  // Aggregate output only. No network requests, record writes, CV text or names.
  process.stdout.write(JSON.stringify({ candidates: input.candidates.length, jobs: input.jobs.length, pairs, comparable,
    withoutPrevious: pairs - comparable, categories, transitions,
    meanScore: pairs ? round(scoreSum / pairs) : null,
    meanChangeOnComparable: comparable ? round(deltaSum / comparable) : null,
    coverageBelow70, pairsMissingRequiredSkills: missingRequired,
    limitation: "Comparação de regras sem avaliações de recrutadores: não mede precisão, falsos positivos ou probabilidade de contratação."
  }, null, 2) + "\n");
}
main().catch(error => { process.stderr.write((error instanceof Error ? error.message : "Falha no ensaio.") + "\n"); process.exitCode = 1; });
