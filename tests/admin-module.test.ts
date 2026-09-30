import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeFileSync } from 'node:fs';
import { csv, csvCell, zip } from '../lib/admin-export';
import { isAdminDataset, adminCatalog } from '../lib/admin-catalog';
import { requireActor } from '../lib/api-auth';
test('CSV neutralises spreadsheet formulas and preserves multiline and UTF-8', () => {
    for (const v of ['=cmd()', '+SUM(A1)', '-2+4', '@SUM(1)', ' \t=1'])
        assert.ok(csvCell(v).startsWith('"\''));
    assert.equal(csvCell('Uma "linha"\noutra'), '"Uma ""linha""\noutra"');
    const result = csv([{ name: 'João', data: ['PT', 'EN'] }]);
    assert.ok(result.startsWith('\uFEFF'));
    assert.ok(result.includes('João'));
    assert.ok(result.includes('[""PT"",""EN""]'));
});
test('ZIP writes independently readable UTF-8 CSV entries and rejects paths', () => {
    const result = zip([{ name: 'contas.csv', content: csv([{ name: 'João' }]) }, { name: 'informacao.txt', content: 'Informação' }]);
    assert.equal(result.readUInt32LE(0), 0x04034b50);
    writeFileSync('/tmp/arynqo-admin-test.zip', result);
    assert.throws(() => zip([{ name: '../evil.csv', content: '' }]));
});
test('Catalog cannot select arbitrary tables or credentials', () => {
    for (const key of ['auth.users', 'user_push_tokens', '__proto__', 'constructor'])
        assert.equal(isAdminDataset(key), false);
    for (const entry of Object.values(adminCatalog)) {
        assert.ok(!entry.fields.includes('ai_embedding'));
        assert.ok(!entry.fields.includes('token'));
        assert.ok(!entry.fields.includes('encrypted_password'));
    }
});
test('Administrative access rejects missing sessions and forged metadata before privileged calls', async (context) => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://admin.test.invalid';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test';
    let calls = 0;
    context.mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => { calls++; const url = String(input); if (url.includes('/auth/v1/user'))
        return Response.json({ id: '11111111-1111-1111-1111-111111111111', user_metadata: { role: 'admin' } }); return Response.json({ role: 'company' }); });
    await assert.rejects(requireActor(new Request('https://test.invalid'), ['admin']), { status: 401 });
    assert.equal(calls, 0);
    await assert.rejects(requireActor(new Request('https://test.invalid', { headers: { authorization: 'Bearer forged' } }), ['admin']), { status: 403 });
    assert.equal(calls, 2);
});
