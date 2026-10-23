import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../app/admin/academia/components/AutomationPanel.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;

function render(run) {
  const data = {
    settings: { enabled: true, auto_publish: false, next_due_at: '2026-10-24T09:00:00Z', monthly_request_limit: 120 },
    ready: { cron: true, provider: true, email: true }, emails: {}, topics: [], usage: null, runs: [run],
  };
  let stateIndex = 0;
  const exports = {};
  runInNewContext(compiled, { exports, require(name) {
    if (name === 'react') return { ...React, useEffect() {}, useCallback: fn => fn,
      useState: initial => [stateIndex++ === 0 ? data : initial, () => {}] };
    if (name === '@/lib/i18n/client') return { useI18n: () => ({ locale: 'pt' }) };
    if (name === '@/lib/authenticated-fetch') return { authenticatedFetch() { throw new Error('Unexpected network call'); } };
    if (name.startsWith('@/lib/')) return require(`../lib/${name.slice('@/lib/'.length)}`);
    if (name === './TopicCalendar') return { default: () => null };
    if (name === './ArticleGenerationButton') return { default: () => React.createElement('button', null, 'Gerar novamente') };
    return require(name);
  } });
  return renderToStaticMarkup(React.createElement(exports.default, { onChanged: async () => {}, onGenerated: async () => {}, onReview() {}, revision: 0 }));
}

const failed = {
  id: 'failed-regeneration', post_id: null, status: 'failed', attempts: 2,
  created_at: '2026-10-22T15:32:52Z', error_code: 'source_unavailable', input_tokens: 0, output_tokens: 0,
  sources: [], academy_topics: { title: 'Como definir um plano de aprendizagem profissional' },
  academy_posts: null, regenerated_from: 'original-run', original: { post_id: 'original-post', status: 'published' },
};

test('failed regeneration explains the source error and keeps access to the published original', () => {
  const html = render(failed);
  for (const text of ['Tentativa de nova versão', 'Não consegui ler nenhuma das fontes', 'O artigo original já está publicado', 'Ler artigo original', 'Repetir geração', 'Gerar novamente']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('source_unavailable'));
  assert.ok(!html.includes('Ainda por gerar'), 'do not show six unusable language buttons without a draft');
});

test('a partial draft still exposes saved versions and retries only missing versions', () => {
  const html = render({ ...failed, post_id: 'partial-post', regenerated_from: null, original: null,
    error_code: 'provider_output_empty_en', academy_posts: { academy_post_translations: [{ locale: 'pt', quality_passed: true }] } });
  assert.ok(html.includes('Repetir versões em falta'));
  assert.ok(html.includes('Ler versão'));
  assert.ok(!html.includes('Ler artigo original'));
});
