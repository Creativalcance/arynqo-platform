import assert from 'node:assert/strict';
import {test} from 'node:test';
import {NextRequest} from 'next/server';
import {officialSearch,occupationName,officialExact} from '../lib/occupation-catalogue';
import {normalizeLocale} from '../lib/i18n/config';
const GET=async(r:NextRequest)=>{const rows=officialSearch(r.nextUrl.searchParams.get('q')||'',normalizeLocale(r.nextUrl.searchParams.get('locale')),r.nextUrl.searchParams.get('id'));return {json:async()=>({items:rows.slice(0,40),total:rows.length})};};
const find=async(q:string,locale='pt')=>(await GET(new NextRequest('https://example.org/api/occupations?locale='+locale+'&q='+encodeURIComponent(q)))).json();
test('autocomplete searches word fragments without requiring word order or accents',async()=>{const a=await find('diretor marketing'),b=await find('marketing diretor');assert.ok(a.total>0);assert.deepEqual(a,b);const c=await find('tecnico'),d=await find('técnico');assert.deepEqual(c,d);assert.ok(c.items.length<=40);});
test('empty search is ordered, unknown terms are empty, selected identity survives translation',async()=>{const r=await find('');assert.equal(r.total,3039);assert.equal((await find('zzzz-no-profession')).total,0);const id=r.items[0].id;for(const l of ['pt','en','fr','es','de','it']){const response=await GET(new NextRequest(`https://example.org/api/occupations?locale=${l}&id=${id}`));const selected=await response.json();assert.equal(selected.items.length,1);assert.equal(selected.items[0].id,id);assert.ok(selected.items[0].label);}});

test("new names are validated and official names reused across languages",()=>{assert.equal(occupationName("  Gestor   de carreiras "),"Gestor de carreiras");for(const value of [null,"a","<script>","123","a".repeat(151),"hello\nworld"])assert.equal(occupationName(value),null);const row=officialSearch("","en")[0];assert.ok(officialExact(row.label,"pt").some(o=>o.id===row.id));});
