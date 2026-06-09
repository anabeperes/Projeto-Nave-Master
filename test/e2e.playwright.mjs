// Teste end-to-end em navegador REAL (Playwright/Chromium).
// Sobe o servidor, abre o painel no Chromium, clica nos botões, recarrega a
// página e valida que o status respondida/reaberta persiste — como a usuária faz.
//
// A chamada ao Supabase é interceptada e respondida com 403, então o painel
// usa sempre os dados de demonstração (MOCK) — teste determinístico, sem rede.
//
// Rodar:  npm run test:e2e
// Pré-requisito (uma vez):  npx playwright install chromium
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const PORT = 3320;
const BASE = `http://localhost:${PORT}`;

let srv, browser, navegadorOk = true;

async function aguardarServidor(tentativas = 40) {
  for (let i = 0; i < tentativas; i++) {
    try { const r = await fetch(BASE + '/'); if (r.ok) return; } catch {}
    await sleep(100);
  }
  throw new Error('Servidor não respondeu a tempo');
}

test.before(async () => {
  srv = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await aguardarServidor();
  try {
    browser = await chromium.launch();
  } catch (e) {
    navegadorOk = false;
    console.error('\n⚠️  Chromium não está instalado. Rode:  npx playwright install chromium\n');
  }
});

test.after(async () => {
  if (browser) await browser.close();
  if (srv) srv.kill();
});

// Abre uma página nova já com o Supabase interceptado (força MOCK) e espera os cards.
async function abrirPainel() {
  const page = await browser.newPage();
  await page.route('**/rest/v1/sugestoes**', route =>
    route.fulfill({ status: 403, contentType: 'application/json', body: '[]' }));
  await page.goto(BASE + '/');
  await page.waitForSelector('#lista .card');
  return page;
}

const cardPend = (page, id) => page.locator(`#lista .card[data-id="${id}"]`);

test('respondida persiste após recarregar (navegador real)', async (t) => {
  if (!navegadorOk) return t.skip('Chromium não instalado');

  let page = await abrirPainel();
  await assert.ok(await cardPend(page, '1').count() === 1, 'id 1 deveria começar pendente');

  await page.click('.card[data-id="1"] .btn-enviada');
  assert.equal(await cardPend(page, '1').count(), 0, 'id 1 deveria sair das pendentes');

  // Recarrega de verdade — o localStorage do navegador persiste
  await page.reload();
  await page.waitForSelector('#lista');
  assert.equal(await cardPend(page, '1').count(), 0, 'BUG: id 1 voltou às pendentes após recarregar');

  // Aparece em Respondidas
  await page.click('.chip[data-f="RESPONDIDAS"]');
  assert.equal(await cardPend(page, '1').count(), 1, 'id 1 deveria estar em Respondidas');
  await page.close();
});

test('reabrir persiste após recarregar (navegador real)', async (t) => {
  if (!navegadorOk) return t.skip('Chromium não instalado');

  let page = await abrirPainel();
  // marca como respondida e vai para Respondidas
  await page.click('.card[data-id="1"] .btn-enviada');
  await page.click('.chip[data-f="RESPONDIDAS"]');
  // reabre
  await page.click('.card[data-id="1"] .btn-enviada');

  // recarrega e confere que voltou para pendentes (aba Todas)
  await page.reload();
  await page.waitForSelector('#lista .card');
  await page.click('.chip[data-f="todas"]');
  assert.equal(await cardPend(page, '1').count(), 1, 'id 1 deveria voltar às pendentes após reabrir e recarregar');
  await page.close();
});

test('contador de pendentes persiste após recarregar (navegador real)', async (t) => {
  if (!navegadorOk) return t.skip('Chromium não instalado');

  let page = await abrirPainel();
  assert.equal(await page.locator('#st-pend').textContent(), '4', 'deveria começar com 4 pendentes');
  await page.click('.card[data-id="1"] .btn-enviada');
  assert.equal(await page.locator('#st-pend').textContent(), '3', 'contador deveria cair para 3');

  await page.reload();
  await page.waitForSelector('#lista');
  assert.equal(await page.locator('#st-pend').textContent(), '3', 'contador deveria seguir 3 após recarregar');
  await page.close();
});
