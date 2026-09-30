import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';

test('Match displays use percentages and the Compatibilidade label',async()=>{
 const paths=['app/empresa/matches/page.tsx','app/dashboard/matches/page.tsx','app/app/matches/page.tsx','app/app/matches/[id]/page.tsx','app/app/vagas/[id]/page.tsx','app/vagas/[id]/JobClient.tsx','app/components/arynqo/MobileAppShell.tsx'];
 for(const path of paths){
  const source=await readFile(path,'utf8');
  assert.doesNotMatch(source,/Compatibilidade IA|\/100/,path);
 }
 const mobileDetail=await readFile('app/app/matches/[id]/page.tsx','utf8');
 assert.ok(mobileDetail.includes('width: `${match.score}%`'));
});
test('Company detail grids allow narrow screens and long content to shrink and wrap',async()=>{
 const source=await readFile('app/empresa/matches/page.tsx','utf8');
 assert.ok(source.includes('grid-cols-1 gap-6 xl:grid-cols-[390px_minmax(0,1fr)]'));
 assert.ok(source.includes('grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_320px]'));
 assert.ok(source.includes('min-w-0 max-w-full [overflow-wrap:anywhere]'));
 assert.ok(source.includes('min-w-0 p-4 sm:p-8'));
 assert.doesNotMatch(source,/xl:grid-cols-\[1fr_320px\]|xl:grid-cols-\[390px_1fr\]/);
});
