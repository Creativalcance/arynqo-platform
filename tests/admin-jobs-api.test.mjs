import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: pathToFileURL(resolve('node_modules/next/dist/compiled/server-only/empty.js')).href, shortCircuit: true };
  return next(specifier, context);
} });
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://admin.test.invalid';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-test';
const actor = '11111111-1111-1111-1111-111111111111';
const job = '22222222-2222-2222-2222-222222222222';
const remove = async request => (await import('../app/api/admin/vagas/route.ts')).DELETE(request);
function request(body = { jobId: job, confirmation: 'Designer' }, token = true) {
  return new Request('https://test.invalid/api/admin/vagas', { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(token ? { authorization: 'Bearer test-token' } : {}) }, body: JSON.stringify(body) });
}

test('job deletion rejects anonymous, company and candidate requests before privileged calls', async context => {
  let role = 'student', calls = 0;
  context.mock.method(globalThis, 'fetch', async input => {
    calls++;
    const url = String(input);
    if (url.includes('/auth/v1/user')) return Response.json({ id: actor, user_metadata: { role: 'admin' } });
    if (url.includes('/profiles?')) return Response.json({ role });
    throw new Error('Unexpected privileged call');
  });
  assert.equal((await remove(request(undefined, false))).status, 401);
  assert.equal(calls, 0);
  assert.equal((await remove(request())).status, 403);
  role = 'company';
  assert.equal((await remove(request())).status, 403);
  assert.equal(calls, 4);
});

test('admin deletion validates input, uses the authenticated actor, and reports RPC failures', async context => {
  let rpcInput, failure = null;
  context.mock.method(globalThis, 'fetch', async (input, init) => {
    const url = String(input);
    if (url.includes('/auth/v1/user')) return Response.json({ id: actor });
    if (url.includes('/profiles?')) return Response.json({ role: 'admin' });
    if (url.includes('/rpc/consume_api_limit')) return Response.json(null);
    if (url.includes('/rpc/admin_delete_job')) {
      rpcInput = JSON.parse(init.body);
      return failure ? Response.json({ code: failure, message: 'private database details' }, { status: 400 }) : new Response(null, { status: 204 });
    }
    throw new Error('Unexpected request');
  });
  for (const body of [null, [], {}, { jobId: 'bad', confirmation: 'Designer' }, { jobId: job, confirmation: '' }]) {
    assert.equal((await remove(request(body))).status, 400);
    assert.equal(rpcInput, undefined);
  }
  const response = await remove(request({ jobId: job, confirmation: ' Designer ', p_actor: job }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(await response.json(), { success: true });
  assert.deepEqual(rpcInput, { p_actor: actor, p_job: job, p_confirmation: 'Designer' });
  for (const [code, status] of [['42501', 403], ['P0002', 404], ['22023', 409], ['23514', 503]]) {
    failure = code;
    const failed = await remove(request());
    assert.equal(failed.status, status);
    assert.equal(failed.headers.get('cache-control'), 'private, no-store');
    assert.ok(!(await failed.text()).includes('private database details'));
  }
});
