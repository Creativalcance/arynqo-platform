import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NextRequest} from 'next/server';
import {GET} from '../app/api/occupations/route';
const find=async(q:string,locale='pt')=>(await GET(new NextRequest('https://example.org/api/occupations?locale='+locale+'&q='+encodeURIComponent(q)))).json();
test('autocomplete searches word fragments without requiring word order or accents',async()=>{const a=await find('diretor marketing'),b=await find('marketing diretor');assert.ok(a.total>0);assert.deepEqual(a,b);const c=await find('tecnico'),d=await find('técnico');assert.deepEqual(c,d);assert.ok(c.items.length<=40);});
test('empty search is ordered, unknown terms are empty, selected identity survives translation',async()=>{const r=await find('');assert.equal(r.total,3039);assert.equal((await find('zzzz-no-profession')).total,0);const id=r.items[0].id;for(const l of ['pt','en','fr','es','de','it']){const response=await GET(new NextRequest(`https://example.org/api/occupations?locale=${l}&id=${id}`));const selected=await response.json();assert.equal(selected.items.length,1);assert.equal(selected.items[0].id,id);assert.ok(selected.items[0].label);}});
