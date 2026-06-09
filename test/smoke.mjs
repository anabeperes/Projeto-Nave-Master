// Smoke test sem dependências: sobe o servidor de verdade e valida que o
// painel é servido e que a fiação crítica (persistência de status + fallback
// para demonstração) está presente. Roda com: npm test
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 3210;
const BASE = `http://localhost:${PORT}`;

// Sobe o servidor uma vez para toda a suíte
const srv = spawn(process.execPath, ['server.mjs'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'ignore',
});

async function aguardarServidor(tentativas = 40) {
  for (let i = 0; i < tentativas; i++) {
    try { const r = await fetch(BASE + '/'); if (r.ok) return; } catch {}
    await sleep(100);
  }
  throw new Error('Servidor não respondeu a tempo');
}

test.before(() => aguardarServidor());
test.after(() => { srv.kill(); });

test('serve o painel na raiz com HTTP 200', async () => {
  const r = await fetch(BASE + '/');
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /Painel da Navegadora/);
});

test('responde 404 para caminho inexistente', async () => {
  const r = await fetch(BASE + '/nao-existe-xyz');
  assert.equal(r.status, 404);
});

test('bloqueia path traversal', async () => {
  const r = await fetch(BASE + '/../../etc/passwd');
  assert.ok(r.status === 403 || r.status === 404, `esperado 403/404, veio ${r.status}`);
});

test('o painel persiste o status entre recarregamentos', async () => {
  const html = await (await fetch(BASE + '/')).text();
  // chave de persistência local existe
  assert.match(html, /KEY_STATUS\s*=\s*"fluxo_status"/);
  // alternarEnviada grava o status (local + supabase)
  assert.match(html, /function alternarEnviada[\s\S]*salvarStatus\(statusSalvos\)/);
  assert.match(html, /function alternarEnviada[\s\S]*salvarStatusSupabase\(/);
  // a persistência reaplica o status salvo por cima da fonte de dados (reconciliação)
  assert.match(html, /aplicarPersistencia[\s\S]*reconciliarStatus\(s, statusSalvos\[s\.id\]\)/);
  assert.match(html, /function reconciliarStatus[\s\S]*s\.status\s*=\s*local\.status/);
});

test('cai no modo demonstração quando o Supabase falha', async () => {
  const html = await (await fetch(BASE + '/')).text();
  // o fetch do Supabase está protegido por try/catch com fallback para MOCK
  assert.match(html, /catch\s*\(e\)\s*\{[\s\S]*usandoMock\s*=\s*true;[\s\S]*return MOCK/);
});
