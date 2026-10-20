'use client';
import { LText } from '@/lib/i18n/client';
import { matchMetrics, type MatchMetricsSource } from '@/lib/match-presentation';

export function MatchCriteria({ match, dark = false }: { match: MatchMetricsSource; dark?: boolean }) {
  const metrics = matchMetrics(match);
  return <div className="space-y-4">
    {metrics.length ? metrics.map(metric => <div key={metric.label}>
      <div className="flex items-start justify-between gap-3 text-sm"><span><LText text={metric.label} />{metric.weight !== null && <span className="block text-xs opacity-65"><LText text="Peso no total" />: {metric.weight}%</span>}</span><span>{metric.value}%</span></div>
      <div className={`mt-2 h-2 overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-slate-100'}`}><div className="h-full rounded-full bg-[#1683FF]" style={{width:`${metric.value}%`}} /></div>
    </div>) : <p className="text-sm"><LText text="O match fica disponível depois de confirmar os cinco campos profissionais do candidato e da vaga." /></p>}
    {match.matching_details?.status === 'evaluated' && <p className="text-xs leading-5 opacity-75"><LText text="Localização, salário, idiomas, formação e tipo de oportunidade são condições a confirmar à parte." /></p>}
  </div>;
}
