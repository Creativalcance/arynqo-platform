import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(readFileSync(new URL('../app/admin/academia/components/AutomationPanel.tsx', import.meta.url),'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;
function harness(failSave = false) {
  const data = { settings: { enabled: true, monthly_request_limit: 120, interval_days: 4, next_due_at: '2026-10-26T09:00:00Z' },
    ready: { cron: true, provider: true, email: true }, emails: {}, topics: [], runs: [], usage: { reserved_requests: 120 } };
  const hooks = [], requests = [], exports = {};
  let index = 0;
  runInNewContext(compiled, { exports, require(name) {
    if (name === 'react') return {
      useCallback: fn => fn, useEffect() {},
      useRef(value) { const at=index++; hooks[at] ??= { current: value }; return hooks[at]; },
      useState(initial) { const at=index++;
        if (!(at in hooks)) hooks[at] = at===0 ? structuredClone(data) : at===3 ? data.settings.enabled : at===4 ? data.settings.monthly_request_limit : initial;
        return [hooks[at], value => { hooks[at] = typeof value === 'function' ? value(hooks[at]) : value; }];
      },
    };
    if (name === '@/lib/i18n/client') return { useI18n: () => ({ locale: 'pt' }) };
    if (name === '@/lib/academy/admin-copy') return require('../lib/academy/admin-copy.ts');
    if (name === '@/lib/i18n/config') return require('../lib/i18n/config.ts');
    if (name.startsWith('./')) return { default: () => null };
    if (name === '@/lib/authenticated-fetch') return { authenticatedFetch: async (path, init) => {
      assert.equal(path,'/api/admin/academy-automation');
      if (!init) return Response.json(data);
      const body = JSON.parse(init.body); requests.push(body);
      if (body.action === 'settings') {
        if (failSave) return Response.json({ error: 'Não foi possível guardar.' }, { status: 500 });
        data.settings = { ...data.settings, ...body };
        return Response.json({ success: true, settings: data.settings });
      }
      assert.equal(body.action,'preview');
      return Response.json({ success: true, skipped: true, reason: 'not_due' });
    } };
    return require(name);
  } });
  function render() { index=0; return exports.default({ onChanged: async () => {}, onGenerated: async () => {}, onReview() {}, onDeleted: async () => {}, revision: 0 }); }
  function nodes(node) {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!node || typeof node !== 'object') return [];
    return [node,...nodes(node.props?.children)];
  }
  function button(label) { return nodes(render()).find(node => node.type==='button' && node.props.children===label); }
  function input() { return nodes(render()).find(node => node.type==='input' && node.props.type==='number'); }
  function content(node) { if (Array.isArray(node)) return node.map(content).join(''); if (node && typeof node==='object') return content(node.props?.children); return node ?? ''; }
  return { button, input, text: () => content(render()), requests };
}

test('unsaved limits cannot start generation; saving updates the applied limit and prevents duplicate submissions', async () => {
  const ui = harness();
  assert.match(ui.text(),/de 4 em 4 dias/);
  ui.input().props.onChange({ target: { value: '300' } });
  assert.match(ui.text(),/alterações por guardar/);
  assert.match(ui.text(),/120 \/ 120/);
  assert.equal(ui.button('Gerar seis rascunhos para validar').props.disabled,true);
  await ui.button('Gerar seis rascunhos para validar').props.onClick();
  assert.equal(ui.requests.length,0,'the action also guards unsaved settings');
  const save = ui.button('Guardar');
  await Promise.all([save.props.onClick(),save.props.onClick()]);
  assert.equal(ui.requests.length,1);
  assert.equal(ui.requests[0].monthly_request_limit,300);
  assert.match(ui.text(),/Guardei o calendário e o limite mensal/);
  assert.match(ui.text(),/120 \/ 300/);
  assert.match(ui.text(),/limite guardado: 180/);
  assert.doesNotMatch(ui.text(),/alterações por guardar/);
  assert.equal(ui.button('Gerar seis rascunhos para validar').props.disabled,false);
});

test('failed saves retain the edited limit and invalid limits remain unsaveable', async () => {
  const ui = harness(true);
  ui.input().props.onChange({ target: { value: '300' } });
  await ui.button('Guardar').props.onClick();
  assert.equal(ui.input().props.value,300);
  assert.match(ui.text(),/Não foi possível guardar/);
  assert.equal(ui.button('Gerar seis rascunhos para validar').props.disabled,true);
  for (const value of ['', '601', '6.5']) {
    ui.input().props.onChange({ target: { value } });
    assert.equal(ui.button('Guardar').props.disabled,true);
    assert.equal(ui.input().props['aria-invalid'],true);
  }
});
