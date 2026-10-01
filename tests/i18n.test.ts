import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {locales,localizedPath,stripLocale,localeAlternates} from '../lib/i18n/config';
import {translator} from '../lib/i18n/translate';
import {csv} from '../lib/admin-export';
import {parseLanguage} from '../lib/profile-options';
import {notificationEmailContent} from '../lib/notification-email';
const catalogs=Object.fromEntries(locales.map(locale=>[locale,JSON.parse(readFileSync(`lib/i18n/messages/${locale}.json`,'utf8'))]));
test('all six catalogs cover identical messages and preserve dynamic placeholders',()=>{
 for(const locale of locales){assert.deepEqual(Object.keys(catalogs[locale]).sort(),Object.keys(catalogs.pt).sort());
 for(const [key,value] of Object.entries(catalogs[locale])) { assert.equal(typeof value,'string'); assert.ok((value as string).trim(),`${locale} empty: ${key}`);assert.deepEqual((key.match(/\{\d+\}/g)||[]).sort(),((value as string).match(/\{\d+\}/g)||[]).sort(),`${locale}: ${key}`); }
 }
});
test('locale navigation preserves destinations and excludes services and assets',()=>{
 assert.equal(localizedPath('/en/vagas?pagina=2#ofertas','de'),'/de/vagas?pagina=2#ofertas');
 for(const path of ['/api/notifications/create','/_next/static/a.js','/logo.png','https://example.invalid','//example.invalid','#menu']) assert.equal(localizedPath(path,'fr'),path);
 assert.equal(stripLocale('/fr'),'/');assert.equal(localizedPath('/','pt'),'/');assert.equal(Object.keys(localeAlternates('/vagas')).length,7);
});
test('translations preserve candidate/company content and runtime values',()=>{
 const t=translator({'Olá {0}, tens {1} candidaturas.':'Hello {0}, you have {1} applications.'});
 assert.equal(t('Olá Société Müller, tens 64 candidaturas.'),'Hello Société Müller, you have 64 applications.');
 assert.equal(t('Original résumé with <script> and 日本語'),'Original résumé with <script> and 日本語');
});
test('notification emails use recipient locale, safe URLs and escaped identity',()=>{
 for(const locale of locales) {const c=notificationEmailContent({to:'test@example.invalid',name:'<script>user</script>',title:'Candidatura recebida',message:'Teste',relatedUrl:'/empresa/vagas',eventKey:'locale-test',locale},'https://www.arynqo.com');
 assert.match(c.html,new RegExp(`lang="${locale==='pt'?'pt-PT':locale}"`));assert.ok(!c.html.includes('<script>user'));assert.ok(c.text.includes(`https://www.arynqo.com${localizedPath('/empresa/vagas',locale)}`));
 }
});

test('localized language names identify the same professional language and exports preserve data',()=>{
 for(const name of ['Alemão','German','allemand','alemán','Deutsch','tedesco']) assert.equal(parseLanguage(`${name} (C1)`).code,'de');
 const t=translator(catalogs.en);const exported=csv([{name:'Société Müller',email:'=formula'}],['name','email'],t);
 assert.ok(exported.startsWith('\uFEFF"Name";"Email"'));assert.ok(exported.includes('Société Müller'));assert.ok(exported.includes("'=formula"));
});
