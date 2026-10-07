import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {normalizeLocale} from '@/lib/i18n/config';
import {optionKey} from '@/lib/profile-options';
import {occupationName,officialExact,officialSearch} from '@/lib/occupation-catalogue';
import {ApiError,apiErrorResponse,enforceApiLimit,requireActor,requireUuid} from '@/lib/api-auth';
function admin(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new ApiError(503,'Não foi possível carregar as profissões.');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
const headers={'Cache-Control':'no-store'};
export async function GET(request:NextRequest){
 try{
 const locale=normalizeLocale(request.nextUrl.searchParams.get('locale'));
 const id=request.nextUrl.searchParams.get('id'),query=optionKey((request.nextUrl.searchParams.get('q')||'').slice(0,150));
 if(id)requireUuid(id,'Profissão');
 const official=officialSearch(query,locale,id);
 if(id&&official.length)return NextResponse.json({items:official,total:official.length},{headers});
 let search=admin().from('matching_occupations').select('id,label',{count:'exact'}).eq('source','community');
 if(id)search=search.eq('id',id);
 else for(const term of query.split(' ').filter(Boolean))search=search.ilike('normalized_name',`%${term.replace(/[\\%_]/g,'\\$&')}%`);
 const {data,error,count}=await search.order('label').limit(40);
 if(error)throw new ApiError(503,'Não foi possível carregar as profissões.');
 const items=[...official,...(data||[])].sort((a,b)=>Number(optionKey(b.label).startsWith(query))-Number(optionKey(a.label).startsWith(query))||a.label.localeCompare(b.label,locale)).slice(0,40);
 return NextResponse.json({items,total:official.length+(count||0)},{headers});
 }catch(error){return apiErrorResponse(error)||NextResponse.json({error:'Não foi possível carregar as profissões.'},{status:503,headers});}
}
export async function POST(request:NextRequest){
 try{
 const actor=await requireActor(request,['student','company','admin']);
 await enforceApiLimit(actor,'occupation-create',20,3600);
 let body;try{body=await request.json();}catch{throw new ApiError(400,'Profissão inválida.');}
 const label=occupationName(body?.label),locale=normalizeLocale(body?.locale);
 if(!label)throw new ApiError(400,'Profissão inválida.');
 const existing=officialExact(label,locale);
 if(existing.length===1)return NextResponse.json({item:existing[0]},{headers});
 if(existing.length>1)return NextResponse.json({error:'Seleciona uma profissão nas sugestões para confirmar a escolha.',items:existing},{status:409,headers});
 const {data,error}=await admin().rpc('ensure_custom_occupation',{p_label:label,p_key:optionKey(label),p_locale:locale});
 if(error||!data?.[0])throw new ApiError(503,'Não foi possível adicionar a profissão. Tenta novamente.');
 return NextResponse.json({item:data[0]},{headers});
 }catch(error){return apiErrorResponse(error)||NextResponse.json({error:'Não foi possível adicionar a profissão. Tenta novamente.'},{status:503,headers});}
}
