import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require=createRequire(import.meta.url);
const compiled=ts.transpileModule(readFileSync(new URL('../app/admin/academia/components/ArticleDeleteButton.tsx',import.meta.url),'utf8'),{
  compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS},
}).outputText;
const settle=()=>new Promise(resolve=>setImmediate(resolve));

for (const target of [{postId:'post-test'},{runId:'failed-run'}]) {
  test(`delete button confirms the exact ${target.postId?'article':'failed attempt'} and prevents duplicate requests`,async()=>{
    let confirmed=false,requests=0,completed=0,finish;
    const messages=[],busy=[];
    const exports={};
    runInNewContext(compiled,{exports,window:{confirm(text){assert.ok(text.includes('Título de teste'));assert.ok(text.includes('não pode ser anulada'));return confirmed;}},require(name){
      if(name==='react')return{useState:initial=>[initial,value=>messages.push(value)],useRef:value=>({current:value})};
      if(name==='@/lib/i18n/client')return{useI18n:()=>({locale:'pt'})};
      if(name==='@/lib/academy/admin-copy')return require('../lib/academy/admin-copy.ts');
      if(name==='@/lib/authenticated-fetch')return{authenticatedFetch:async(path,init)=>{
        requests++;assert.equal(path,'/api/admin/academy-automation');assert.equal(init.method,'DELETE');
        assert.deepEqual(JSON.parse(init.body),target.postId?{post_id:'post-test'}:{run_id:'failed-run'});
        return new Promise(resolve=>{finish=()=>resolve(Response.json({success:true,post_id:target.postId??null}));});
      }};
      return require(name);
    }});
    const element=exports.default({...target,title:'Título de teste',onBusyChange:value=>busy.push(value),onDeleted:async postId=>{assert.equal(postId,target.postId);completed++;}});
    const button=element.props.children[0];
    button.props.onClick();await settle();assert.equal(requests,0,'cancel never deletes');
    confirmed=true;button.props.onClick();button.props.onClick();assert.equal(requests,1);
    finish();await settle();assert.equal(completed,1);assert.deepEqual(busy,[true,false]);
    assert.ok(messages.includes('Eliminei o conteúdo selecionado.'));
  });
}
