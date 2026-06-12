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
      // Confirmações de diálogo sempre aceitas nos testes
      window.confirm = () => true;
    },
  });
  const { document } = dom.window;
  // Espera o start() assíncrono terminar de renderizar (cards OU mensagem de "vazio")
  await aguardar(() => document.querySelector('#lista')?.childElementCount > 0, dom.window);
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

test('botão "Marcar todas como enviadas" zera as pendentes e PERSISTE após recarregar', async () => {
  const ls = criarLocalStorageCompartilhado();
  let dom = await carregarPainel(ls);
  let doc = dom.window.document;

  // começa com 4 pendentes e o botão visível
  assert.equal(doc.getElementById('st-pend').textContent, '4', 'deveria começar com 4 pendentes');
  const btn = doc.getElementById('btn-marcar-todas');
  assert.ok(btn && btn.style.display !== 'none', 'botão deveria estar visível com pendentes');

  // clica em marcar todas
  btn.click();
  assert.equal(doc.getElementById('st-pend').textContent, '0', 'todas deveriam virar enviadas');
  assert.equal(doc.querySelectorAll('#lista .card').length, 0, 'nenhum card pendente deveria sobrar');
  assert.equal(doc.getElementById('btn-marcar-todas').style.display, 'none', 'botão deveria sumir sem pendentes');
  dom.window.close();

  // RELOAD — continua tudo enviado
  dom = await carregarPainel(ls);
  doc = dom.window.document;
  assert.equal(doc.getElementById('st-pend').textContent, '0', 'deveria seguir 0 pendentes após recarregar');
  dom.window.close();
});

test('marcar todas respeita o filtro de urgência (só marca o que está à vista)', async () => {
  const ls = criarLocalStorageCompartilhado();
  let dom = await carregarPainel(ls);
  let doc = dom.window.document;

  // filtra só ALTA — MOCK tem 1 pendente ALTA (id 3)
  dom.window.setTab('ALTA');
  assert.equal(doc.querySelectorAll('#lista .card').length, 1, 'deveria haver 1 pendente ALTA');

  doc.getElementById('btn-marcar-todas').click();
  // marcou só a ALTA; sobram 3 pendentes (as MEDIA/BAIXA)
  assert.equal(doc.getElementById('st-pend').textContent, '3', 'só a ALTA deveria ter sido marcada');
  dom.window.close();
});

test('busca encontra por assunto/intenção, não só por nome', async () => {
  const ls = criarLocalStorageCompartilhado();
  const dom = await carregarPainel(ls);
  const doc = dom.window.document;

  // "criativo" só aparece na mensagem do id 2 (Erika), não no nome de ninguém
  const busca = doc.getElementById('busca');
  busca.value = 'criativo';
  busca.dispatchEvent(new dom.window.Event('input'));

  const cards = doc.querySelectorAll('#lista .card');
  assert.equal(cards.length, 1, 'deveria achar só a mensagem que fala de criativo');
  assert.equal(cards[0].getAttribute('data-id'), '2', 'o card encontrado deveria ser o id 2');
  dom.window.close();
});

// ============================================================
//  MODO SUPABASE (fetch devolve linhas do banco; usandoMock = false)
//  Regra validada: a ação do navegador é soberana — marcada como enviada
//  NUNCA volta para pendentes no F5, qualquer que seja o estado no banco.
//  Só o clique em "Reabrir" traz a mensagem de volta.
// ============================================================
function linhaRemota(extra = {}) {
  return {
    id: 'r1', contact_name: 'Maria Teste', whatsapp_number: '55 11 9XXXX-0001',
    horas_aguardando: 1, qtd_mensagens: 1, urgencia: 'MEDIA', intencao: 'TESTE',
    mensagens: 'Oi, tudo bem?', justificativa: '', sugestao_resposta: 'Olá!',
    lembrete: '', criada_em: new Date(Date.now() - 3600000).toISOString(),
    enviada_em: null, status: 'pendente', ...extra,
  };
}

// Carrega o painel com um "Supabase" simulado: GET devolve as linhas dadas e
// os PATCH de status são capturados em `patches` para inspeção.
async function carregarPainelSupabase(localStorageCompartilhado, linhas, patches = []) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/painel/index.html',
    beforeParse(window) {
      Object.defineProperty(window, 'localStorage', {
        value: localStorageCompartilhado, configurable: true,
      });
      window.confirm = () => true;
      window.fetch = (url, opts = {}) => {
        const u = String(url);
        if (u.includes('/rest/v1/sugestoes')) {
          if ((opts.method || 'GET') === 'PATCH') {
            patches.push({ url: u, body: JSON.parse(opts.body) });
            return Promise.resolve({ ok: true, status: 204, json: async () => [] });
          }
          return Promise.resolve({ ok: true, status: 200, json: async () => linhas });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => [] });
      };
    },
  });
  const { document } = dom.window;
  await aguardar(() => document.querySelector('#lista')?.childElementCount > 0, dom.window);
  return dom;
}

test('Supabase: enviada neste navegador NÃO volta no F5, mesmo com o banco dizendo pendente', async () => {
  const ls = criarLocalStorageCompartilhado();
  // O navegador marcou como enviada, mas o PATCH se perdeu: o banco continua
  // 'pendente' e ainda traz um enviada_em mais novo (estado adversarial, que
  // derrotava a reconciliação antiga por timestamp).
  const marcadaEm = new Date(Date.now() - 600000).toISOString();
  ls.setItem('fluxo_status', JSON.stringify({ r1: { status: 'enviada', enviada_em: marcadaEm, em: marcadaEm } }));
  const linhas = [linhaRemota({ status: 'pendente', enviada_em: new Date().toISOString() })];

  const patches = [];
  const dom = await carregarPainelSupabase(ls, linhas, patches);
  const doc = dom.window.document;

  assert.equal(cardPendente(doc, 'r1'), null, 'BUG: enviada voltou para pendentes após o F5');
  trocarFiltro(dom, 'RESPONDIDAS');
  assert.ok(cardPendente(doc, 'r1'), 'a mensagem deveria estar em Respondidas');

  // Autocura: o painel reenvia o status ao banco que ficou para trás
  await aguardar(() => patches.length > 0, dom.window);
  assert.equal(patches[0].body.status, 'enviada', 'o status enviada deveria ser reenviado ao Supabase');
  dom.window.close();
});

test('Supabase: só o "Reabrir" manual traz a mensagem de volta, e isso persiste no F5', async () => {
  const ls = criarLocalStorageCompartilhado();
  const linhas = [linhaRemota({ status: 'enviada', enviada_em: new Date().toISOString() })];

  // 1ª carga: sem ação local, vale o banco — está em Respondidas
  let dom = await carregarPainelSupabase(ls, linhas);
  let doc = dom.window.document;
  assert.equal(cardPendente(doc, 'r1'), null, 'sem ação local, deveria respeitar o banco (enviada)');
  trocarFiltro(dom, 'RESPONDIDAS');
  const btnReabrir = doc.querySelector('.card[data-id="r1"] .btn-enviada');
  assert.ok(btnReabrir, 'botão Reabrir não encontrado em Respondidas');
  btnReabrir.click();
  dom.window.close();

  // RELOAD: o banco ainda diz enviada, mas a reabertura manual é soberana
  dom = await carregarPainelSupabase(ls, linhas);
  doc = dom.window.document;
  assert.ok(cardPendente(doc, 'r1'), 'reaberta manualmente deveria seguir pendente após o F5');
  dom.window.close();
});

test('Supabase: fila ordena pela hora da MENSAGEM do mentorado, não pela criação do card', async () => {
  const ls = criarLocalStorageCompartilhado();
  const agora = Date.now();
  const linhas = [
    // Card gerado há 2h, mas a mensagem chegou há 10 min → deve ficar NO TOPO
    linhaRemota({ id: 'msg-nova', contact_name: 'Mensagem Nova',
      criada_em: new Date(agora - 2 * 3600000).toISOString(),
      ultima_mensagem_em: new Date(agora - 10 * 60000).toISOString() }),
    // Card gerado há 30 min (lote mais novo), mas a mensagem é de 3h atrás
    linhaRemota({ id: 'msg-velha', contact_name: 'Mensagem Velha',
      criada_em: new Date(agora - 30 * 60000).toISOString(),
      ultima_mensagem_em: new Date(agora - 3 * 3600000).toISOString() }),
    // Card antigo sem o campo novo (gravado antes do passo 7) → cai na criada_em
    linhaRemota({ id: 'sem-campo', contact_name: 'Sem Campo',
      criada_em: new Date(agora - 90 * 60000).toISOString(),
      ultima_mensagem_em: undefined }),
  ];

  const dom = await carregarPainelSupabase(ls, linhas);
  const ordem = [...dom.window.document.querySelectorAll('#lista .card')].map(c => c.getAttribute('data-id'));
  assert.deepEqual(ordem, ['msg-nova', 'sem-campo', 'msg-velha'],
    'a fila deveria ordenar pela última mensagem do mentorado (mais recente primeiro)');
  dom.window.close();
});

test('Supabase: sugestão substituída pelo robô fica fora do painel mesmo com status local', async () => {
  const ls = criarLocalStorageCompartilhado();
  ls.setItem('fluxo_status', JSON.stringify({ r1: { status: 'pendente', enviada_em: null, em: new Date().toISOString() } }));
  const linhas = [
    linhaRemota({ status: 'substituida' }),
    linhaRemota({ id: 'r2', mensagens: 'Mandei outra mensagem!', status: 'pendente' }),
  ];

  const patches = [];
  const dom = await carregarPainelSupabase(ls, linhas, patches);
  const doc = dom.window.document;
  assert.equal(cardPendente(doc, 'r1'), null, 'a substituída não deveria ressuscitar nas pendentes');
  assert.ok(cardPendente(doc, 'r2'), 'o cartão novo (que a substituiu) deveria estar pendente');
  trocarFiltro(dom, 'RESPONDIDAS');
  assert.equal(cardPendente(doc, 'r1'), null, 'a substituída também não aparece em Respondidas');
  assert.equal(patches.length, 0, 'não deveria reenviar status de sugestão substituída');
  dom.window.close();
});

test('marcarEnviada tira da fila e persiste (ação do toast ao copiar)', async () => {
  const ls = criarLocalStorageCompartilhado();
  const dom = await carregarPainel(ls);
  const doc = dom.window.document;

  assert.ok(cardPendente(doc, '4'), 'id 4 deveria começar pendente');
  // marcarEnviada é a função disparada pela ação "Marcar enviada" do toast ao copiar
  dom.window.marcarEnviada('4');
  assert.equal(cardPendente(doc, '4'), null, 'id 4 deveria sair das pendentes');

  const salvo = JSON.parse(ls.getItem('fluxo_status') || '{}');
  assert.equal(salvo['4']?.status, 'enviada', 'status deveria persistir no localStorage');
  dom.window.close();
});
