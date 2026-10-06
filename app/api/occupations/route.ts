import { NextRequest, NextResponse } from 'next/server';
import occupations from '@/lib/data/occupations.json';
import { normalizeLocale } from '@/lib/i18n/config';
import { optionKey } from '@/lib/profile-options';
export function GET(request:NextRequest){
 const locale=normalizeLocale(request.nextUrl.searchParams.get('locale'));
 const id=request.nextUrl.searchParams.get('id'),query=optionKey((request.nextUrl.searchParams.get('q')||'').slice(0,100));
 const rows=occupations.filter(o=>id?o.id===id:!query||optionKey(o.labels[locale]).includes(query)||optionKey(o.labels.en).includes(query));
 return NextResponse.json({items:rows.slice(0,40).map(o=>({id:o.id,label:o.labels[locale]})),total:rows.length},{headers:{'Cache-Control':'public, max-age=3600'}});
}
