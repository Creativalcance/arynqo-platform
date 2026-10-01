// Run with the public Supabase test environment. No account or production writes.
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','localhost','--port','3100'],{env:process.env,stdio:['ignore','pipe','pipe']});
let logs='';server.stdout.on('data',data=>{logs+=data});server.stderr.on('data',data=>{logs+=data});
const base='http://localhost:3100'; const results=[];
try {
 for(let attempt=0;attempt<60;attempt++){if(logs.includes('Ready in'))break;await new Promise(resolve=>setTimeout(resolve,1000));}
 assert.ok(logs.includes('Ready in'),'dev server did not start');
 for(const locale of ['pt','en','fr','es','de','it']) {
 const path=locale==='pt'?'':`/${locale}`;
 const response=await fetch(base+(path||'/'));const html=await response.text();assert.equal(response.status,200);assert.ok(new RegExp(`<html lang="${locale==='pt'?'pt-PT':locale}"`).test(html),`HTML language mismatch: ${locale}, ${html.match(/<html[^>]+/)?.[0]}, headers ${JSON.stringify(Object.fromEntries(response.headers))}`);
 assert.ok(new RegExp(`rel="canonical" href="https://www.arynqo.com${path}/?"`).test(html),`Canonical mismatch: ${locale}`);assert.equal((html.match(/rel="alternate" hrefLang=/g)||[]).length,7);assert.ok(!/<title>[^<]*Portugal/.test(html));
 results.push({locale,status:response.status,title:html.match(/<title>(.*?)<\/title>/)?.[1]});
 const login=await fetch(base+path+'/login'); assert.match(login.headers.get('x-robots-tag'),/noindex/);
 const manifest=await (await fetch(base+`/api/manifest?lang=${locale}`)).json();assert.equal(manifest.lang,locale==='pt'?'pt-PT':locale);assert.equal(manifest.start_url,path+'/app');
 }
 const jobs=await fetch(base+'/fr/vagas');const jobsHtml=await jobs.text();assert.equal(jobs.status,200);assert.ok(jobsHtml.includes('Sur site') && jobsHtml.includes('À distance'));for(const wrong of ['Président','Télécommande','Personnes âgées','aria-label="Administrateurs"'])assert.ok(!jobsHtml.includes(wrong),`Wrong recruiting label: ${wrong}`);assert.ok(jobsHtml.includes('Voir l’offre : Directeur') || jobsHtml.includes('Voir l’offre : Diretor') || jobsHtml.includes('Voir l’offre : Frontend'));
 const legal=await fetch(base+'/fr/politica-de-privacidade');const body=await legal.text();assert.equal(legal.status,200);assert.ok(body.includes('Politique de confidentialité'));
 const invalid=await fetch(base+'/de/api/notifications/create');assert.equal(invalid.status,404);
 const redirect=await fetch(base+'/pt/vagas',{redirect:'manual'});assert.equal(redirect.status,308);
 const preferred=await fetch(base+'/dashboard',{headers:{Cookie:'arynqo_locale=it'},redirect:'manual'});assert.equal(new URL(preferred.headers.get('location'),base).href,base+'/it/dashboard');
 const robots=await (await fetch(base+'/robots.txt')).text();assert.ok(robots.includes('Disallow: /fr/empresa/'));assert.ok(!robots.includes('Disallow: /empresas'));
 const sitemap=await fetch(base+'/sitemap.xml');assert.equal(sitemap.status,200);const xml=await sitemap.text();assert.ok(xml.includes('https://www.arynqo.com/de/vagas'));assert.ok(xml.includes('hreflang="it"'));assert.ok(!xml.includes('/dashboard'));
 console.log(JSON.stringify({results,checks:'canonical, hreflang, SSR lang, private noindex, preference redirect, manifests, legal page, sitemap, robots, API isolation passed'},null,2));
 writeFileSync('docs/i18n-http-verification.json',JSON.stringify({results,checks:['canonical','hreflang','SSR lang','private noindex','preference redirect','manifests','legal page','sitemap','robots','API isolation','reviewed recruitment labels']},null,2)+'\n');
} catch(error){console.error(error);console.error(logs.slice(-6000));process.exitCode=1;} finally {server.kill('SIGTERM');}
