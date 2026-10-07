import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Render the actual detail and its helpers without mounting the authenticated page.
const source = readFileSync('app/empresa/matches/page.tsx', 'utf8');
const ast = ts.createSourceFile('detail.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set(['CandidateDetail', 'Badge', 'InfoPanel', 'ChipList', 'MatchMetric', 'ActionButton']);
const components = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.has(node.name?.text)).map(node => node.getText(ast)).join('\n');
const compiled = ts.transpileModule(`${components}\nexport {CandidateDetail};`, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
const messages = JSON.parse(readFileSync('lib/i18n/messages/pt.json', 'utf8'));
const exports = {};
runInNewContext(compiled, { exports, require: createRequire(import.meta.url),
  LText: ({ text }) => messages[text] || text,
  LElement: ({ as, ...props }) => React.createElement(as, props),
  Link: props => React.createElement('a', props), workModelLabels: {},
});
const match = { id: 'match', student_id: 'student', job_id: 'job', match_score: 15,
  skills_score: 0, role_score: 0, seniority_score: 35, location_score: 100, work_model_score: 0, opportunity_type_score: 0, salary_score: 0,
  student: { id: 'student', headline: 'Perfil profissional', ai_summary: 'Resumo do candidato', contact_visibility: 'approval_required' },
  publicProfile: { name: 'Nome privado' }, matchingSkills: ['Competência coincidente'], missingSkills: ['Competência em falta'],
  strengths: ['Ponto forte identificado'], gaps: ['Aspeto por confirmar'],
};
const props = { match, hasAction: () => false, handleAction: async () => {}, isPremium: true,
  handleUpgradeClick: () => {}, canContactDirectly: () => false, requestContact: async () => {}, requestingMatchId: '' };
const render = changes => renderToStaticMarkup(React.createElement(exports.CandidateDetail, { ...props, ...changes }));

test('all candidate detail blocks and recruitment actions are visible on the initial render', () => {
  const html = render();
  for (const text of ['Resumo do candidato', 'Competência coincidente', 'Competência em falta', 'Ponto forte identificado', 'Aspeto por confirmar', messages['Aceitar candidato'] || 'Aceitar candidato']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(source, /activeDetailTab|setActiveDetailTab|type DetailTab/);
  assert.doesNotMatch(html, /role="tab|\shidden[=> ]|<details|display:\s*none/);
  assert.match(html, /<h3[^>]*>Resumo profissional/);
});
test('missing summary never hides competencies or actions and empty lists retain their explanation', () => {
  const html = render({ match: { ...match, student: { ...match.student, ai_summary: null }, matchingSkills: [], missingSkills: [], strengths: [], gaps: [] } });
  assert.ok(!html.includes('Resumo profissional'));
  assert.ok(html.includes(messages['Sem competências coincidentes identificadas.'] || 'Sem competências coincidentes identificadas.'));
  assert.ok(html.includes(messages['Aceitar candidato'] || 'Aceitar candidato'));
});
test('expanded detail preserves candidate identity and contact permission gates', () => {
  const protectedHtml = render();
  assert.ok(!protectedHtml.includes('Nome privado'));
  assert.ok(!protectedHtml.includes('/empresa/candidatos/student'));
  const allowed = render({ canContactDirectly: () => true });
  assert.ok(allowed.includes('Nome privado'));
  assert.ok(allowed.includes('/empresa/candidatos/student?jobId=job'));
  const closed = render({ match: { ...match, student: { ...match.student, contact_visibility: 'closed' } } });
  assert.ok(!closed.includes('/empresa/candidatos/student'));
  assert.ok(closed.includes('disabled=""'));
});
