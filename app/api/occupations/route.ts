import { NextRequest, NextResponse } from 'next/server';
import occupations from '@/lib/data/occupations.json';
import { normalizeLocale } from '@/lib/i18n/config';
import { optionKey } from '@/lib/profile-options';
export function GET(request:NextRequest){
 const locale=normalizeLocale(request.nextUrl.searchParams.get('locale'));
 const id=request.nextUrl.searchParams.get('id'),query=optionKey((request.nextUrl.searchParams.get('q')||'').slice(0,100));
 const terms=query.split(' ').filter(Boolean);
 const rows=occupations.filter(o=>id?o.id===id:terms.every(term=>optionKey(o.labels[locale]).includes(term))||terms.every(term=>optionKey(o.labels.en).includes(term))).sort((a,b)=>Number(optionKey(b.labels[locale]).startsWith(query))-Number(optionKey(a.labels[locale]).startsWith(query))||a.labels[locale].localeCompare(b.labels[locale],locale));
 return NextResponse.json({items:rows.slice(0,40).map(o=>({id:o.id,label:o.labels[locale]})),total:rows.length},{headers:{'Cache-Control':'public, max-age=3600'}});
}
