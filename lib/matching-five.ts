import { areasCompatible, validPreferences, type MatchingPreferences } from './matching-preferences';
import { optionKey } from './profile-options';

export const FIVE_FIELD_VERSION = 'five-fields-v3';
export const MATCH_WEIGHTS = { profession: 35, skills: 35, seniority: 15, model: 10, area: 5 } as const;
export const MATCH_LABELS = { profession: 'Profissão', skills: 'Competências essenciais', seniority: 'Senioridade', model: 'Modelo de trabalho', area: 'Área profissional' } as const;

export function calculateFiveFieldMatch(candidate: MatchingPreferences | null, job: MatchingPreferences | null, aliases: ReadonlyMap<string, string> = new Map()) {
  if (!validPreferences(candidate, 'candidate') || !validPreferences(job, 'job') || !candidate.confirmed || !job.confirmed) {
    return { version: FIVE_FIELD_VERSION, status: 'incomplete' as const, score: null, contributions: null };
  }
  const canonical = (s: string) => optionKey(aliases.get(optionKey(s)) || s);
  const candidateSkills = new Set(candidate.skills.map(canonical));
  // Preserve the vacancy's display labels; equivalent requirements count only once.
  const required = [...new Map(job.skills.map(s => [canonical(s), s])).entries()];
  const matchingSkills = required.filter(([key]) => candidateSkills.has(key)).map(([, label]) => label);
  const missingSkills = required.filter(([key]) => !candidateSkills.has(key)).map(([, label]) => label);
  const contributions = {
    profession: candidate.profession === job.profession ? MATCH_WEIGHTS.profession : 0,
    skills: MATCH_WEIGHTS.skills * matchingSkills.length / required.length,
    seniority: job.levels.includes(candidate.levels[0]) ? MATCH_WEIGHTS.seniority : 0,
    model: job.models.some(m => candidate.models.includes(m)) ? MATCH_WEIGHTS.model : 0,
    area: areasCompatible(candidate.area, job.area) ? MATCH_WEIGHTS.area : 0,
  };
  return { version: FIVE_FIELD_VERSION, status: 'evaluated' as const, score: Math.round(Object.values(contributions).reduce((a, b) => a + b, 0)), contributions, matchingSkills, missingSkills, recommendation: 'human_review' as const };
}

export type MatchingDetails = ReturnType<typeof calculateFiveFieldMatch> & { candidateRevision?: number; jobRevision?: number };
export function currentFiveFieldResult(result: { version?: string; candidateRevision?: number; jobRevision?: number } | null, candidateRevision: number, jobRevision: number) {
  return !!result && result.version === FIVE_FIELD_VERSION && result.candidateRevision === candidateRevision && result.jobRevision === jobRevision;
}

type MatchingSource = { id: string; matching_preferences: MatchingPreferences | null; matching_revision: number };
export function buildMatchRecord(candidate: MatchingSource, job: MatchingSource, aliases: ReadonlyMap<string, string> = new Map()) {
  const result = calculateFiveFieldMatch(candidate.matching_preferences, job.matching_preferences, aliases);
  const evaluated = result.status === 'evaluated';
  const contributions = result.contributions;
  const metric = (key: keyof typeof MATCH_WEIGHTS) => contributions ? Math.round(contributions[key] / MATCH_WEIGHTS[key] * 100) : null;
  const strengths = contributions ? (Object.keys(MATCH_WEIGHTS) as Array<keyof typeof MATCH_WEIGHTS>).filter(key => contributions[key] === MATCH_WEIGHTS[key]).map(key => `${MATCH_LABELS[key]}: alinhamento confirmado.`) : [];
  const gaps = contributions ? (Object.keys(MATCH_WEIGHTS) as Array<keyof typeof MATCH_WEIGHTS>).filter(key => contributions[key] < MATCH_WEIGHTS[key]).map(key => `${MATCH_LABELS[key]}: alinhamento por confirmar.`) : ['É necessário preencher e confirmar os cinco campos profissionais do candidato e da vaga.'];
  if (evaluated && result.missingSkills.length) gaps.push(`Competências essenciais ainda não evidenciadas: ${result.missingSkills.join(', ')}.`);
  const clearlyUnrelated = !!contributions && contributions.profession === 0 && contributions.skills === 0;
  const fullyAligned = contributions && contributions.profession > 0 && contributions.seniority > 0 && contributions.model > 0 && result.missingSkills?.length === 0;
  return {
    student_id: candidate.id, job_id: job.id,
    matching_details: { ...result, candidateRevision: candidate.matching_revision, jobRevision: job.matching_revision },
    match_score: result.score, skills_score: metric('skills'), role_score: metric('profession'), seniority_score: metric('seniority'), work_model_score: metric('model'),
    location_score: null, salary_score: null, education_language_score: null, opportunity_type_score: null,
    match_category: clearlyUnrelated ? 'not_relevant' : evaluated && result.score >= 65 && fullyAligned ? 'recommended' : evaluated && result.score >= 50 ? 'possible' : 'low_compatibility',
    is_relevant: !clearlyUnrelated,
    strengths, gaps, matching_skills: result.matchingSkills || [], missing_skills: result.missingSkills || [], ai_recommendations: [],
    ai_reason: evaluated ? `Compatibilidade: ${result.score}%. Profissão 35%, competências essenciais 35%, senioridade 15%, modelo de trabalho 10% e área profissional 5%. Localização, salário, idiomas, formação e tipo de oportunidade são condições a confirmar à parte. A pontuação não prevê o sucesso da contratação.` : 'Por calcular: faltam campos profissionais confirmados no perfil ou na vaga.',
  };
}
