import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NextRequest} from 'next/server';
import {GET,POST} from '../app/api/occupations/route';
test('custom occupation API: shared search, reopening and authenticated idempotent creation',async()=>{
 const previousFetch=global.fetch,previousEnv={...process.env};
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test';process.env.SUPABASE_SERVICE_ROLE_KEY='test';
 const item={id:'00000000-0000-4000-8000-000000000123',label:'Gestor de Carreiras Digitais'};
 const calls:string[]=[];
 global.fetch=async(input,init)=>{
 const url=String(input);calls.push(url);
 const response=(data:unknown)=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json','Content-Range':'0-0/1'}});
 if(url.includes('/auth/v1/user'))return response({id:'00000000-0000-4000-8000-000000000001'});
 if(url.includes('/profiles?'))return response({role:'student',locale:'pt'});
 if(url.includes('/rpc/consume_api_limit'))return response(null);
 if(url.includes('/rpc/ensure_custom_occupation')){assert.equal(JSON.parse(String(init?.body)).p_key,'gestor de carreiras digitais');return response([item]);}
 if(url.includes('/matching_occupations?'))return response([item]);
 throw Error('Unexpected request '+url);
 };
 try{
 const anonymous=await POST(new NextRequest('https://example.org/api/occupations',{method:'POST',body:JSON.stringify({label:item.label})}));assert.equal(anonymous.status,401);assert.equal(calls.length,0);
 for(const q of ['?q=carreiras%20digitais','?id='+item.id+'&locale=fr']){
 const response=await GET(new NextRequest('https://example.org/api/occupations'+q));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.ok((await response.json()).items.some((o:{id:string})=>o.id===item.id));
 }
 for(const label of [item.label,'  GESTOR   DE CARREIRAS DIGITAIS  ']){
 const response=await POST(new NextRequest('https://example.org/api/occupations',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({label,locale:'pt'})}));assert.equal(response.status,200);assert.deepEqual((await response.json()).item,item);
 }
 }finally{global.fetch=previousFetch;process.env=previousEnv;}
});
