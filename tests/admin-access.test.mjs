import assert from 'node:assert/strict';
import {test} from 'node:test';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://admin.test.invalid';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='anon-test';
globalThis.React=React;
test('Administrative controls are absent from the initial HTML',async()=>{
 const {default:Page}=await import('../app/admin/contas/page.tsx');
 const html=renderToStaticMarkup(React.createElement(Page));
 assert.match(html,/A verificar acesso/);
 assert.doesNotMatch(html,/Exportar|Contas e dados|Pesquisar contas|Escolher colunas/);
 const {default:JobsPage}=await import('../app/admin/vagas/page.tsx');
 const jobsHtml=renderToStaticMarkup(React.createElement(JobsPage));
 assert.match(jobsHtml,/A verificar acesso/);
 assert.doesNotMatch(jobsHtml,/Eliminar vaga|Pesquisar vagas|Gerir vagas/);
});
test('Access gate checks the protected server role, not browser metadata',async context=>{
 const {GET}=await import('../app/api/admin/acesso/route.ts');
 const request=new Request('https://test.invalid/api/admin/acesso',{headers:{authorization:'Bearer test'}});
 let role='student';
 context.mock.method(globalThis,'fetch',async input=>{
  const url=String(input);
  if(url.includes('/auth/v1/user'))return Response.json({id:'11111111-1111-1111-1111-111111111111',user_metadata:{role:'admin'}});
  if(url.includes('/profiles?'))return Response.json({role});
  throw new Error('Unexpected privileged request');
 });
 assert.equal((await GET(new Request('https://test.invalid/api/admin/acesso'))).status,401);
 assert.equal((await GET(request)).status,403);
 role='company';assert.equal((await GET(request)).status,403);
 role='admin';const response=await GET(request);assert.equal(response.status,200);
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(await response.json(),{authorized:true});
});
