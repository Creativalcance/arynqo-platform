import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { NextRequest } from 'next/server';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://profile.test.invalid';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test-only';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
process.env.OPENAI_API_KEY='test-only';
async function POST(request: NextRequest) { const route = await import('../app/api/ai/parse-cv/route'); return route.POST(request); }
const originalFetch = globalThis.fetch;
let activeFetch: typeof fetch;
globalThis.fetch = (input, init) => activeFetch(input, init);
after(() => { globalThis.fetch = originalFetch; });
const userId='20000000-0000-0000-0000-000000000001';
function setup(role='student', incomplete=false) {
 const calls: {url:string;method:string;body?:string}[]=[];
 activeFetch = async(input: RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);const method=init?.method||'GET';calls.push({url,method,body:typeof init?.body==='string'?init.body:undefined});
  if(url.endsWith('/auth/v1/user'))return Response.json({id:userId,is_anonymous:false});
  if(url.includes('/rest/v1/profiles?'))return Response.json({role,locale:'pt'});
  if(url.includes('/rpc/consume_api_limit'))return Response.json(null);
  if(url.includes('/files/')&&method==='DELETE')return Response.json({id:'file-test',deleted:true});
  if(url.endsWith('/files'))return Response.json({id:'file-test'});
  if(url.endsWith('/responses'))return Response.json({id:'response-test',object:'response',status:incomplete?'incomplete':'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({headline:'Software developer',skills:['SQL'],role:'admin',cv_url:'forged.pdf',salary_min:80000})}]}]});
  throw new Error('Unexpected request: '+url);
 };return calls;
}
function request(body:FormData,token=true){return new NextRequest('https://arynqo.test.invalid/api/ai/parse-cv',{method:'POST',headers:token?{authorization:'Bearer test-token'}:{},body});}
function form(){const b=new FormData();b.set('source','linkedin');b.set('consent','true');b.set('text','Software developer at Example Company. Experience with SQL databases and application development since 2021.');return b;}
test('anonymous and company users cannot import candidate data',async ()=>{
 const calls=setup('company');assert.equal((await POST(request(form(),false))).status,401);assert.equal((await POST(request(form()))).status,403);assert.ok(!calls.some(c=>c.url.includes('openai')));
});
test('text import returns a draft only, with no profile or file writes',async ()=>{
 const calls=setup();const response=await POST(request(form()));assert.equal(response.status,200);assert.deepEqual(await response.json(),{headline:'Software developer',skills:['SQL']});
 assert.ok(!calls.some(c=>c.url.includes('/files')));assert.ok(!calls.some(c=>c.method==='PATCH'||c.url.includes('/storage/')));
 const ai=JSON.parse(calls.find(c=>c.url.endsWith('/responses'))!.body!);assert.equal(ai.store,false);assert.match(ai.input[0].content[0].text,/Não infiras competências/);
});
test('consent, source size and PDF signature are checked before AI calls',async ()=>{
 const calls=setup();const absent=form();absent.delete('consent');assert.equal((await POST(request(absent))).status,400);
 const short=form();short.set('text','just a URL');assert.equal((await POST(request(short))).status,400);
 const bad=form();bad.delete('text');bad.set('file',new File(['not a PDF'],'profile.pdf',{type:'application/pdf'}));assert.equal((await POST(request(bad))).status,400);
 assert.ok(!calls.some(c=>c.url.includes('openai')));
});
test('PDF files are deleted after incomplete extraction and never returned as a successful import',async ()=>{
 const calls=setup('student',true);const b=form();b.delete('text');b.set('file',new File(['%PDF-1.7 synthetic test'],'profile.pdf',{type:'application/pdf'}));
 assert.equal((await POST(request(b))).status,500);assert.ok(calls.some(c=>c.url.endsWith('/files/file-test')&&c.method==='DELETE'));
});
