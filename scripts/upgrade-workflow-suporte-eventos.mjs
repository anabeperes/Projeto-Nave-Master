// ============================================================
//  Incremento 2 — Suporte completo + categoria Eventos
// ------------------------------------------------------------
//  Transforma "Workflow dash.json" de forma determinística:
//   1. Substitui o prompt de SUPORTE (hoje degradado, 8 intenções fixas)
//      pelo conteúdo canônico das skills do repo: padroes (base completa de
//      "como funciona" + 13 intenções) + cancelamento + congelamento +
//      reclamação. Conteúdo lido verbatim dos .md (zero paráfrase).
//   2. Adiciona a categoria EVENTOS ao mapa specialistPrompts (eventos,
//      retiros, comunidade, newsletter, PIF e dúvidas de metodologia/entregas).
//   3. Adiciona EVENTOS ao Roteador (descrição da categoria + enum do
//      formato de resposta) e enriquece a descrição de SUPORTE com as
//      demandas sensíveis (cancelamento, congelamento, reclamação).
//
//  Roda com: node scripts/upgrade-workflow-suporte-eventos.mjs
//  Lê e reescreve "Workflow dash.json". Idempotente: aborta se já aplicado.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WF = path.join(root, 'Workflow dash.json');
const SKILLS = path.join(root, '.claude/skills/nave-suporte');

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FALHOU: ' + msg);
}

// lê uma skill do repo e remove o frontmatter YAML do topo
function skill(name) {
  const raw = fs.readFileSync(path.join(SKILLS, name), 'utf8');
  const body = raw.replace(/^---[\s\S]*?---\s*/, '').trim();
  assert(body.length > 200, `skill ${name} parece vazia apos remover frontmatter`);
  return body;
}

// --- carrega o workflow -----------------------------------------------------
const wf = JSON.parse(fs.readFileSync(WF, 'utf8'));
const byName = Object.fromEntries(wf.nodes.map((n) => [n.name, n]));

function getNode(name) {
  const n = byName[name];
  assert(n, 'nó não encontrado: ' + name);
  return n;
}

const espNode = getNode('Parse Roteador + MR Especialista');
const rotNode = getNode('Montar Request: Roteador');

assert(!rotNode.parameters.jsCode.includes('| EVENTOS]'), 'Workflow já parece atualizado (EVENTOS no Roteador). Abortando.');
assert(!espNode.parameters.jsCode.includes('"EVENTOS"'), 'Workflow já parece atualizado (EVENTOS no Especialista). Abortando.');

// ============================================================
//  CONTEÚDO CANÔNICO DAS SKILLS
// ============================================================
const padroes = skill('padroes.md');
const cancelamento = skill('cancelamento.md');
const congelamento = skill('congelamento.md');
const reclamacao = skill('reclamacao.md');

// --- prompt novo de SUPORTE -------------------------------------------------
const suporteHeader = [
  '# Agente de Suporte — Mentoria Fluxo',
  '',
  'Você é o especialista em suporte da Mentoria Fluxo. Cobre dúvidas operacionais e de funcionamento (primeiros passos, acesso às plataformas, Fluxer, análises, agenda) e também as demandas sensíveis: cancelamento, congelamento (pausa) e reclamação/insatisfação.',
  '',
  'Identifique a demanda e siga UM playbook:',
  '- Dúvida operacional ou "como funciona" → Playbook Operacional (abaixo).',
  '- Pedido de cancelamento, "quero sair", "cancelar a mentoria" → Playbook de Cancelamento.',
  '- Pedido de pausa por saúde, luto ou divórcio → Playbook de Congelamento.',
  '- Reclamação ou insatisfação com a mentoria, uma análise, um plano ou o atendimento → Playbook de Reclamação.',
  '',
  'Retorne SEMPRE no formato de resposta do playbook que você acionou. Em qualquer caso, inclua o conteúdo da resposta (RESPOSTA_BASE ou CONTEÚDO_DA_RESPOSTA) e AÇÃO_ADICIONAL.',
  '',
  'Fora do seu escopo (são de outros agentes): dúvidas de tráfego/anúncios, de copy/páginas/quiz, e pedidos de revisão de material enviado pelo mentorado (feedback).'
].join('\n');

const newSuporte = [
  suporteHeader,
  '---',
  '# Playbook Operacional',
  padroes,
  '---',
  '# Playbooks de demandas sensíveis',
  '',
  'Quando a mensagem for sobre cancelamento, pausa/congelamento ou reclamação, ignore o Playbook Operacional acima e siga o playbook correspondente abaixo, usando o formato de resposta dele.',
  '',
  '## Playbook de Cancelamento',
  cancelamento,
  '## Playbook de Congelamento',
  congelamento,
  '## Playbook de Reclamação',
  reclamacao
].join('\n\n');

// --- prompt novo de EVENTOS -------------------------------------------------
const eventosHeader = [
  '# Agente de Eventos e Metodologia — Mentoria Fluxo',
  '',
  'Você é o especialista em eventos, retiros, comunidade, newsletter e indicações (PIF) da Mentoria Fluxo, e também em explicar como a mentoria funciona: a metodologia, as entregas (Ajuste de Velas, Reunião de Diagnóstico, análises, planos de ação), os níveis da trilha e a linha do tempo da jornada.',
  '',
  'Responda dúvidas informativas sobre o programa, suas entregas e seus eventos usando a base de conhecimento abaixo. Use o formato de resposta indicado (INTENÇÃO / RESPOSTA_BASE / AÇÃO_ADICIONAL).',
  '',
  'Fora do seu escopo (são do agente de Suporte): problemas operacionais ("não consigo acessar", login, link quebrado), cancelamento, congelamento e reclamação/insatisfação.'
].join('\n');

const newEventos = [eventosHeader, '---', '# Base de conhecimento', padroes].join('\n\n');

assert(newSuporte.length > 4000, 'prompt de SUPORTE composto ficou curto demais');
assert(newEventos.length > 2000, 'prompt de EVENTOS composto ficou curto demais');

// ============================================================
//  1) ESPECIALISTA — troca SUPORTE e adiciona EVENTOS no specialistPrompts
// ============================================================
{
  const jsCode = espNode.parameters.jsCode;
  const marker = 'const specialistPrompts = ';
  const startMark = jsCode.indexOf(marker);
  assert(startMark >= 0, 'marcador specialistPrompts não encontrado');
  const objStart = startMark + marker.length;
  const endMarker = ';\n\nconst systemPrompt = specialistPrompts[categoria]';
  const objEnd = jsCode.indexOf(endMarker, objStart);
  assert(objEnd > objStart, 'fim do objeto specialistPrompts não encontrado');

  const obj = JSON.parse(jsCode.slice(objStart, objEnd));
  assert(obj.SUPORTE && obj['TRÁFEGO'] && obj.COPY && obj.FEEDBACK, 'specialistPrompts não tem as 4 chaves esperadas');

  obj.SUPORTE = newSuporte; // substitui o prompt degradado
  obj.EVENTOS = newEventos; // adiciona a nova categoria
  // TRÁFEGO, COPY e FEEDBACK são preservados como estavam.

  espNode.parameters.jsCode =
    jsCode.slice(0, objStart) + JSON.stringify(obj) + jsCode.slice(objEnd);
}

// ============================================================
//  2) ROTEADOR — descrição da categoria EVENTOS + enum + SUPORTE enriquecido
// ============================================================
function replaceOnce(node, search, replacement, label) {
  const before = node.parameters.jsCode;
  assert(before.includes(search), `${label}: trecho não encontrado`);
  const count = before.split(search).length - 1;
  assert(count === 1, `${label}: esperado 1 ocorrência, achei ${count}`);
  node.parameters.jsCode = before.replace(search, replacement);
}

function replaceAll(node, search, replacement, expected, label) {
  const before = node.parameters.jsCode;
  const count = before.split(search).length - 1;
  assert(count === expected, `${label}: esperado ${expected} ocorrências, achei ${count}`);
  node.parameters.jsCode = before.split(search).join(replacement);
}

// 2a) descrição de SUPORTE ganha as demandas sensíveis
replaceOnce(
  rotNode,
  '- Link da análise, horário de reunião distante',
  '- Link da análise, horário de reunião distante\\n- Cancelamento, pausa ou congelamento, pedido para sair da mentoria\\n- Reclamação ou insatisfação com a mentoria, análise, plano ou atendimento',
  'Roteador: enriquece descrição de SUPORTE'
);

// 2b) bloco da categoria EVENTOS, inserido antes do formato de resposta
const eventosCategoria =
  '**EVENTOS** — Eventos, comunidade e como a mentoria funciona:\\n' +
  '- Eventos, retiros, lives, gravações (quando é, qual o link, posso levar alguém)\\n' +
  '- Comunidade do WhatsApp, canal Pro+Master, newsletter Diário de um Fluxer\\n' +
  '- PIF, programa de indicações, prêmios por indicar\\n' +
  '- Como a mentoria funciona: níveis da trilha, linha do tempo, o que é o Ajuste de Velas, como funcionam as análises e os planos de ação, o que é cada entrega\\n\\n';
replaceOnce(
  rotNode,
  '## Formato de resposta obrigatório',
  eventosCategoria + '## Formato de resposta obrigatório',
  'Roteador: insere categoria EVENTOS'
);

// 2c) enum do formato (aparece nos dois blocos de formato)
replaceAll(
  rotNode,
  '[SUPORTE | TRÁFEGO | COPY | FEEDBACK]',
  '[SUPORTE | TRÁFEGO | COPY | FEEDBACK | EVENTOS]',
  2,
  'Roteador: atualiza enum CATEGORIA'
);

// ============================================================
//  VALIDAÇÃO
// ============================================================
// sintaxe JS de todos os nós de código
for (const n of wf.nodes) {
  if (n.type === 'n8n-nodes-base.code') {
    try {
      // eslint-disable-next-line no-new-func
      new Function(n.parameters.jsCode);
    } catch (e) {
      throw new Error(`Sintaxe inválida no nó "${n.name}": ${e.message}`);
    }
  }
}

// confere que EVENTOS realmente entrou no mapa do Especialista
{
  const jsCode = espNode.parameters.jsCode;
  const marker = 'const specialistPrompts = ';
  const objStart = jsCode.indexOf(marker) + marker.length;
  const objEnd = jsCode.indexOf(';\n\nconst systemPrompt = specialistPrompts[categoria]', objStart);
  const obj = JSON.parse(jsCode.slice(objStart, objEnd));
  assert(Object.keys(obj).join(',') === 'SUPORTE,TRÁFEGO,COPY,FEEDBACK,EVENTOS', 'chaves finais inesperadas: ' + Object.keys(obj));
  assert(obj.SUPORTE.includes('Playbook de Cancelamento'), 'SUPORTE não recebeu o playbook de cancelamento');
  assert(obj.SUPORTE.includes('Playbook de Congelamento'), 'SUPORTE não recebeu o playbook de congelamento');
  assert(obj.SUPORTE.includes('Playbook de Reclamação'), 'SUPORTE não recebeu o playbook de reclamação');
  assert(obj.EVENTOS.includes('Diário de um Fluxer'), 'EVENTOS não tem a base de conhecimento');
}

// round-trip JSON
const out = JSON.stringify(wf, null, 2);
JSON.parse(out); // sanity

fs.writeFileSync(WF, out + '\n');

console.log('OK — workflow atualizado (Incremento 2).');
console.log('Nós:', wf.nodes.length);
console.log('SUPORTE agora tem', newSuporte.length, 'chars; EVENTOS tem', newEventos.length, 'chars.');
