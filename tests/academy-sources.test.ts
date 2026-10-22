import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchSource } from '../lib/academy/sources';
const url = 'https://europass.europa.eu/en/learn-europe/plan-your-learning';
const html = () => new Response('<p>' + 'Useful learning guidance. '.repeat(80) + '</p>', { headers: { 'content-type': 'text/html' } });
test('transient source failure retries once', async t => {
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>++calls===1?new Response('',{status:503}):html());
 assert.ok((await fetchSource(url)).text.length>500);
 assert.equal(calls,2);
});
test('approved relative redirect is followed and recorded', async t => {
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>++calls===1?new Response(null,{status:301,headers:{location:'/en/learning'}}):html());
 assert.equal((await fetchSource(url)).url,'https://europass.europa.eu/en/learning');
});
test('unapproved redirect is rejected before contacting its target', async t => {
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}})});
 await assert.rejects(fetchSource(url),/invalid_source/);
 assert.equal(calls,1);
});
test('persistent failures stop after two reads; access denials are not retried', async t => {
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('',{status:503})});
 await assert.rejects(fetchSource(url),/source_unavailable/);
 assert.equal(calls,2);
 t.mock.restoreAll(); calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('',{status:403})});
 await assert.rejects(fetchSource(url),/source_unavailable/);
 assert.equal(calls,1);
});
