// Teste de DOM de verdade (jsdom): carrega painel/index.html, clica nos botões
// e simula um RELOAD preservando o localStorage — exatamente como um navegador.
// Valida a correção: o status respondida/reaberta sobrevive ao recarregar.
// Roda com: npm test   (não precisa de navegador instalado)
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import { JSDOM } from 'jsdom';

const HTML_PATH = fileURLToPath(new URL('../painel/index.html', import.meta.url));
const html = await readFile(HTML_PATH, 'utf8');

// localStorage em memória, COMPARTILHADO entre os "reloads" — simula a
// persistência do navegador entre uma carga de página e a seguinte.
function criarLocalStorageCompartilhado() {
  const dados = new Map();
  return {
    get length() { return dados.size; },
    key(i) { return [...dados.keys()][i] ?? null; },
    getItem(k) { return dados.has(k) ? dados.get(k) : null; },
    setItem(k, v) { dados.set(String(k), String(v)); },
    removeItem(k) { dados.delete(k); },
    clear() { dados.clear(); },
  };
}

// Carrega o painel numa nova janela jsdom usando o localStorage compartilhado.
// O fetch é forçado a falhar para cair no modo demonstração (dados MOCK).
async function carregarPainel(localStorageCompartilhado) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/painel/index.html',
    beforeParse(window) {
      Object.defineProperty(window, 'localStorage', {
        value: localStorageCompartilhado, configurable: true,
      });
      // Sem rede: responde como o Supabase bloqueado (403) → painel cai no MOCK
      window.fetch = () => Promise.resolve({ ok: false, status: 403, json: async () => [] });
    },
  });
  const { document } = dom.window;
  // Espera o start() assíncrono renderizar os cards
  await aguardar(() => document.querySelectorAll('#lista .card').length > 0, dom.window);
  return dom;
}

async function aguardar(condicao, window, timeout = 3000) {
  const inicio = Date.now();
  while (Date.now() - inicio < timeout) {
    if (condicao()) return;
    await sleep(20);
  }
  throw new Error('Condição não satisfeita a tempo');
}

const cardPendente = (doc, id) => doc.querySelector(`#lista .card[data-id="${id}"]`);
const trocarFiltro = (dom, f) => dom.window.setTab(f);

test('marcar como respondida tira da pendente e PERSISTE após recarregar', async () => {
  const ls = criarLocalStorageCompartilhado();

  // 1ª carga — id "1" (Tatiana) começa pendente
  let dom = await carregarPainel(ls);
  let doc = dom.window.document;
  assert.ok(cardPendente(doc, '1'), 'id 1 deveria estar pendente no início');

  // Clica de verdade no botão "Marcar como enviada" do card
  const btn = doc.querySelector('.card[data-id="1"] .btn-enviada');
  assert.ok(btn, 'botão de marcar como enviada não encontrado');
  btn.click();

  // Saiu da lista de pendentes (aba "Todas")
  assert.equal(cardPendente(doc, '1'), null, 'id 1 deveria sair das pendentes após marcar');
  // E foi gravado no localStorage
  const salvo = JSON.parse(ls.getItem('fluxo_status') || '{}');
  assert.equal(salvo['1']?.status, 'enviada', 'status não foi persistido no localStorage');
  dom.window.close();

  // 2ª carga (RELOAD) com o mesmo localStorage — aqui estava o bug
  dom = await carregarPainel(ls);
  doc = dom.window.document;
  assert.equal(cardPendente(doc, '1'), null, 'BUG: id 1 voltou para pendentes após recarregar');

  // E aparece na aba "Respondidas"
  trocarFiltro(dom, 'RESPONDIDAS');
  assert.ok(cardPendente(doc, '1'), 'id 1 deveria aparecer em Respondidas após recarregar');
  dom.window.close();
});

test('reabrir pela aba Respondidas volta para pendente e PERSISTE após recarregar', async () => {
  const ls = criarLocalStorageCompartilhado();
  // Pré-condição: id "1" já marcado como respondido
  ls.setItem('fluxo_status', JSON.stringify({ '1': { status: 'enviada', enviada_em: new Date().toISOString() } }));

  let dom = await carregarPainel(ls);
  let doc = dom.window.document;

  // Vai para Respondidas e clica em "Reabrir"
  trocarFiltro(dom, 'RESPONDIDAS');
  const btnReabrir = doc.querySelector('.card[data-id="1"] .btn-enviada');
  assert.ok(btnReabrir, 'botão de reabrir não encontrado em Respondidas');
  btnReabrir.click();

  // localStorage atualizado para pendente
  let salvo = JSON.parse(ls.getItem('fluxo_status') || '{}');
  assert.equal(salvo['1']?.status, 'pendente', 'reabertura não foi persistida');
  dom.window.close();

  // RELOAD — deve continuar pendente
  dom = await carregarPainel(ls);
  doc = dom.window.document;
  assert.ok(cardPendente(doc, '1'), 'id 1 deveria estar pendente após reabrir e recarregar');
  dom.window.close();
});

test('contador de pendentes reflete o status persistido após recarregar', async () => {
  const ls = criarLocalStorageCompartilhado();
  // MOCK tem 4 pendentes (ids 1-4) e 2 enviadas (5,6)
  let dom = await carregarPainel(ls);
  let doc = dom.window.document;
  assert.equal(doc.getElementById('st-pend').textContent, '4', 'deveria começar com 4 pendentes');

  doc.querySelector('.card[data-id="1"] .btn-enviada').click();
  assert.equal(doc.getElementById('st-pend').textContent, '3', 'contador deveria cair para 3');
  dom.window.close();

  // RELOAD — contador continua em 3
  dom = await carregarPainel(ls);
  doc = dom.window.document;
  assert.equal(doc.getElementById('st-pend').textContent, '3', 'contador deveria seguir 3 após recarregar');
  dom.window.close();
});
