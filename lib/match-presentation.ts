import { MATCH_LABELS, MATCH_WEIGHTS, type MatchingDetails } from './matching-five';

export function formatMatchScore(score: number | null | undefined) {
  return typeof score === 'number' && Number.isFinite(score) ? `${Math.round(score)}%` : 'Por calcular';
}
export function averageMatchScore(scores: Array<number | null | undefined>): number | null {
  const available = scores.filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
  return available.length ? Math.round(available.reduce((sum, score) => sum + score, 0) / available.length) : null;
}
export type MatchMetricsSource = { matching_details?: MatchingDetails | null; skills_score?: number | null; role_score?: number | null; seniority_score?: number | null; work_model_score?: number | null; location_score?: number | null; salary_score?: number | null; education_language_score?: number | null; opportunity_type_score?: number | null };
export function matchMetrics(row: MatchMetricsSource) {
  if (row.matching_details?.status === 'evaluated') {
    const contributions = row.matching_details.contributions;
    return (Object.keys(MATCH_WEIGHTS) as Array<keyof typeof MATCH_WEIGHTS>).map(key => ({label: MATCH_LABELS[key], value: Math.round(contributions[key] / MATCH_WEIGHTS[key] * 100), weight: MATCH_WEIGHTS[key]}));
  }
  if (row.matching_details) return [];
  return ([['Competências', row.skills_score], ['Função', row.role_score], ['Senioridade', row.seniority_score], ['Modelo de trabalho', row.work_model_score], ['Localização', row.location_score], ['Salário', row.salary_score], ['Formação / Idiomas', row.education_language_score], ['Tipo de oportunidade', row.opportunity_type_score]] as const).filter(([,value]) => value != null).map(([label,value]) => ({label,value: value!,weight:null}));
}
