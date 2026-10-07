import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

test('catalog maintenance preserves reviewed Portuguese copy and adds new source keys', () => {
  const directory = mkdtempSync(join(tmpdir(), 'arynqo-copy-'));
  const write = (path, value) => writeFileSync(join(directory, path), JSON.stringify(value));
  try {
    for (const path of ['app', 'lib/i18n/messages', 'scripts']) {
      mkdirSync(join(directory, path), { recursive: true });
    }
    const reviewed = { 'Criar conta': 'Criar a minha conta', Gaps: 'Aspetos a confirmar' };
    for (const locale of ['pt', 'en', 'fr', 'es', 'de', 'it']) {
      write(`lib/i18n/messages/${locale}.json`, reviewed);
    }
    write('lib/i18n/academy-source.json', []);
    write('scripts/i18n-overrides.json', { 'Criar conta': Array(5).fill('Create account') });
    writeFileSync(join(directory, 'app/page.tsx'), 'export default function Page() { return <p>Nova mensagem</p>; }');
    for (const script of ['extract-i18n.mjs', 'apply-i18n-overrides.mjs']) {
      execFileSync(process.execPath, [fileURLToPath(new URL(`../scripts/${script}`, import.meta.url))], {
        cwd: directory,
        stdio: 'pipe',
      });
      const catalog = JSON.parse(readFileSync(join(directory, 'lib/i18n/messages/pt.json'), 'utf8'));
      assert.equal(catalog['Criar conta'], reviewed['Criar conta']);
      assert.equal(catalog.Gaps, reviewed.Gaps);
      assert.equal(catalog['Nova mensagem'], 'Nova mensagem');
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
