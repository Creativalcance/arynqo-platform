import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
registerHooks({ resolve(specifier, context, next) {
        if (specifier === 'server-only')
            return { url: pathToFileURL(resolve('node_modules/next/dist/compiled/server-only/empty.js')).href, shortCircuit: true };
        return next(specifier, context);
    } });
async function GET(request) { return (await import('../app/api/admin/dados/route')).GET(request); }
async function fileGET(request) { return (await import('../app/api/admin/ficheiros/route')).GET(request); }
const actorId = '11111111-1111-1111-1111-111111111111';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://admin.test.invalid';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-test';
function request(query = '', token = true) { return new Request('https://test.invalid/api/admin/dados' + query, { headers: token ? { authorization: 'Bearer test-token' } : {} }); }
test('Both administrative APIs reject anonymous and non-admin access before service queries', async (context) => {
    let calls = 0;
    context.mock.method(globalThis, 'fetch', async (input) => {
        calls++;
        if (String(input).includes('/auth/v1/user'))
            return Response.json({ id: actorId, user_metadata: { role: 'admin' } });
        return Response.json({ role: 'student' });
    });
    assert.equal((await GET(request('', false))).status, 401);
    assert.equal((await fileGET(request('?id=' + actorId, false))).status, 401);
    assert.equal(calls, 0);
    const {POST}=await import('../app/api/admin/dados/route');
    assert.equal((await POST(new Request('https://test.invalid/api/admin/dados',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataset:'contas'})}))).status,401);
    assert.equal(calls,0);
    assert.equal((await GET(request())).status, 403);
    assert.equal((await fileGET(request('?id=' + actorId))).status, 403);
    assert.equal(calls, 4);
});
test('Admin listings require audit success, private caching and reject arbitrary datasets', async (context) => {
    let auditFail = false, auditCalls = 0;
    context.mock.method(globalThis, 'fetch', async (input) => {
        const url = String(input);
        if (url.includes('/auth/v1/user'))
            return Response.json({ id: actorId });
        if (url.includes('/profiles?'))
            return Response.json({ role: 'admin' });
        if (url.includes('/rpc/consume_api_limit'))
            return Response.json(null);
        if (url.includes('/rpc/admin_accounts'))
            return Response.json({ total: 1, rows: [{ id: actorId, name: 'João', email: 'test@example.invalid' }] });
        if (url.includes('/admin_access_log')) {
            auditCalls++;
            return auditFail ? Response.json({ message: 'write failure', code: 'XX000' }, { status: 500 }) : new Response(null, { status: 201 });
        }
        throw new Error('Unexpected request ' + url);
    });
    const response = await GET(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal((await response.json()).total, 1);
    assert.equal(auditCalls, 1);
    assert.equal((await GET(request('?dataset=auth.users'))).status, 400);
    assert.equal((await GET(request('?format=csv&columns=encrypted_password'))).status, 400);
    auditFail = true;
    const failed = await GET(request());
    assert.equal(failed.status, 503);
    assert.ok(!(await failed.text()).includes('test@example.invalid'));
});
test('Document downloads never accept caller-supplied storage paths', async (context) => {
    context.mock.method(globalThis, 'fetch', async (input) => {
        const url = String(input);
        if (url.includes('/auth/v1/user'))
            return Response.json({ id: actorId });
        if (url.includes('/profiles?'))
            return Response.json({ role: 'admin' });
        if (url.includes('/rpc/consume_api_limit'))
            return Response.json(null);
        if (url.includes('/rpc/admin_files'))
            return Response.json({ rows: [] });
        throw new Error('Unexpected storage access');
    });
    assert.equal((await fileGET(request('?id=../../secret'))).status, 400);
    assert.equal((await fileGET(request('?id=' + actorId + '&bucket=other&path=secret'))).status, 404);
});
test('Authorised file download resolves stored object by ID and logs before disclosure', async context => {
 let logged=false,downloaded='';
 context.mock.method(globalThis,'fetch',async(input)=>{
 const url=String(input);
 if(url.includes('/auth/v1/user'))return Response.json({id:actorId});
 if(url.includes('/profiles?'))return Response.json({role:'admin'});
 if(url.includes('/rpc/consume_api_limit'))return Response.json(null);
 if(url.includes('/rpc/admin_files'))return Response.json({rows:[{id:actorId,bucket_id:'student-cvs',name:actorId+'/curriculo.pdf',size:4}]});
 if(url.includes('/storage/v1/object/')){downloaded=url;return new Response('test',{headers:{'Content-Type':'application/pdf'}});}
 if(url.includes('/admin_access_log')){logged=true;return new Response(null,{status:201});}
 throw new Error('Unexpected call');
 });
 const response=await fileGET(request('?id='+actorId+'&bucket=other&path=forged'));
 assert.equal(response.status,200);assert.ok(logged);assert.ok(downloaded.endsWith('/student-cvs/'+actorId+'/curriculo.pdf'));
 assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('content-type'),'application/octet-stream');assert.equal(response.headers.get('content-disposition'),'attachment; filename="curriculo.pdf"');assert.equal(await response.text(),'test');
});
