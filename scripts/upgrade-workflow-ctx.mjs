// ============================================================
//  Incremento 1 — Contexto da conversa + histórico + modelos por tarefa
// ------------------------------------------------------------
//  Transforma "Workflow dash.json" (produção) de forma determinística:
//   1. Persiste mensagens OUTGOING no banco (passa a existir histórico).
//   2. Adiciona o agente de CONTEXTO (nave-contexto) como passo 0 da geração.
//   3. Injeta o "brief de contexto" no Roteador, Especialista e Redator.
//   4. Faz Contexto/Roteador/Perfil rodarem no Haiku (mais rápido/barato).
//   5. A query de conversas passa a trazer o histórico recente da conversa.
//
//  Roda com: node scripts/upgrade-workflow-ctx.mjs
//  Lê e reescreve "Workflow dash.json". Idempotente: aborta se já aplicado.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WF = path.join(root, 'Workflow dash.json');

const HAIKU = 'claude-haiku-4-5-20251001';

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FALHOU: ' + msg);
}

// --- carrega o workflow -----------------------------------------------------
const wf = JSON.parse(fs.readFileSync(WF, 'utf8'));
const byName = Object.fromEntries(wf.nodes.map((n) => [n.name, n]));

assert(!byName['Montar Request: Contexto'], 'Workflow já parece atualizado (Contexto existe). Abortando para não duplicar.');

function getNode(name) {
  const n = byName[name];
  assert(n, 'nó não encontrado: ' + name);
  return n;
}

// substitui UMA ocorrência num campo de string do nó, com verificação
function replaceOnce(node, field, search, replacement, label) {
  const before = node.parameters[field];
  assert(typeof before === 'string', `${label}: campo ${field} não é string`);
  assert(before.includes(search), `${label}: trecho esperado não encontrado -> ${JSON.stringify(search).slice(0, 80)}`);
  const after = before.replace(search, replacement);
  assert(after !== before, `${label}: replace não alterou nada`);
  node.parameters[field] = after;
}

// --- prompt canônico do agente de contexto (do próprio repo) ----------------
let contextoSys = fs.readFileSync(path.join(root, '.claude/agents/nave-contexto.md'), 'utf8');
contextoSys = contextoSys.replace(/^---[\s\S]*?---\s*/, '').trim();
assert(contextoSys.includes('CONTINUIDADE_PARA_O_REDATOR'), 'prompt do nave-contexto não carregou corretamente');

// ============================================================
//  1) PERSISTIR OUTGOING — novo nó Postgres + religação
// ============================================================
const pgCreds = getNode('Marcar Conversa como Lida').credentials;

const inserirOutgoing = {
  parameters: {
    operation: 'executeQuery',
    query:
      "INSERT INTO messages (contact_id, whatsapp_number, contact_name, direction, content, evolution_msg_id, status, instancia)\n" +
      "VALUES (upsert_contact($1, $2), $1, $2, 'outgoing', $3, $4, 'read', $5)\n" +
      "ON CONFLICT (evolution_msg_id) DO NOTHING;",
    options: {
      queryReplacement:
        "=={{ $json.whatsapp_number }},={{ $json.contact_name }},={{ $json.content }},={{ $json.evolution_msg_id }},={{ $json.instancia }}"
    }
  },
  id: 'c0a1b2c3-3333-4333-8333-000000000c03',
  name: 'Inserir Mensagem Outgoing',
  type: 'n8n-nodes-base.postgres',
  typeVersion: 2.5,
  position: [6096, 416],
  credentials: pgCreds
};

// ============================================================
//  2) AGENTE DE CONTEXTO — Montar Request: Contexto + API: Contexto
// ============================================================
const contextoCode = [
  '// Passo 0 — Agente de Contexto (nave-contexto): le historico + mensagem atual e gera o brief.',
  'const sanitize = (s) => String(s == null ? "" : s).replace(/[\\u0060]/g, "\'");',
  'const historico = sanitize($json.historico_recente) || "(sem historico anterior)";',
  'const msgs = sanitize($json.mensagens_concatenadas);',
  'const systemPrompt = ' + JSON.stringify(contextoSys) + ';',
  'const userPrompt = "Historico recente da conversa (mensagens ja tratadas):\\n>>>\\n" + historico + "\\n<<<\\n\\nMensagem atual do mentorado (a ser respondida agora):\\n>>>\\n" + msgs + "\\n<<<";',
  'return { json: { whatsapp_number: $json.whatsapp_number, contact_name: $json.contact_name, mensagens_concatenadas: $json.mensagens_concatenadas, historico_recente: $json.historico_recente || "", horas_aguardando: $json.horas_aguardando, qtd_mensagens: $json.qtd_mensagens, anthropic_body: { model: ' + JSON.stringify(HAIKU) + ', max_tokens: 400, temperature: 0.1, system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: userPrompt }] } } };'
].join('\n');

const montarContexto = {
  parameters: { mode: 'runOnceForEachItem', jsCode: contextoCode },
  id: 'c0a1b2c3-1111-4111-8111-000000000c01',
  name: 'Montar Request: Contexto',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [5040, 1296]
};

// API: Contexto = clone exato do API: Roteador (mesmos headers/credenciais/batching)
const apiRoteador = getNode('API: Roteador');
const apiContexto = JSON.parse(JSON.stringify(apiRoteador));
apiContexto.id = 'c0a1b2c3-2222-4222-8222-000000000c02';
apiContexto.name = 'API: Contexto';
apiContexto.position = [5440, 1296];

// ============================================================
//  3) ROTEADOR — passa a ler o brief do Contexto + Haiku
// ============================================================
const rotNode = getNode('Montar Request: Roteador');
const rotOld = rotNode.parameters.jsCode;
const rm = rotOld.match(/const systemPrompt = `([\s\S]*?)`;\n/);
assert(rm, 'systemPrompt do Roteador não encontrado para extração');
const rotSys = rm[1];
assert(rotSys.includes('Agente Roteador'), 'systemPrompt do Roteador parece incompleto');

rotNode.parameters.jsCode = [
  '// Passo 0.5 — Le o BRIEF do Contexto e monta o request do Roteador (categoria + urgencia).',
  'const sanitize = (s) => String(s == null ? "" : s).replace(/[\\u0060]/g, "\'");',
  'const ctxResp = $json;',
  "const original = $('Montar Request: Contexto').item.json;",
  'const contextoBrief = ((ctxResp.content && ctxResp.content[0] && ctxResp.content[0].text) || "").trim();',
  'const mentorado = sanitize(original.contact_name) || "Sem nome";',
  'const horas = Number(original.horas_aguardando || 0).toFixed(1);',
  'const qtd = Number(original.qtd_mensagens || 0);',
  'const msgs = sanitize(original.mensagens_concatenadas);',
  'const systemPrompt = ' + JSON.stringify(rotSys) + ';',
  'const userPrompt = "Mentorado: " + mentorado + "\\nHoras aguardando resposta: " + horas + "h\\nQuantidade de mensagens nao lidas: " + qtd + "\\n\\nBRIEF DE CONTEXTO (do agente de contexto):\\n>>>\\n" + (contextoBrief || "(sem contexto)") + "\\n<<<\\n\\nMensagens (em ordem cronologica):\\n>>>\\n" + msgs + "\\n<<<";',
  'return { json: { whatsapp_number: original.whatsapp_number, contact_name: mentorado, mensagens_concatenadas: msgs, historico_recente: original.historico_recente || "", horas_aguardando: horas, qtd_mensagens: qtd, contexto_brief: contextoBrief, anthropic_body: { model: ' + JSON.stringify(HAIKU) + ', max_tokens: 256, temperature: 0.1, system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: userPrompt }] } } };'
].join('\n');

// ============================================================
//  4) ESPECIALISTA — recebe o brief + carrega-o adiante
// ============================================================
const espNode = getNode('Parse Roteador + MR Especialista');
replaceOnce(
  espNode, 'jsCode',
  'Mensagens do mentorado (em ordem cronológica):',
  'BRIEF DE CONTEXTO:\\n"""\\n${original.contexto_brief || "(sem contexto)"}\\n"""\\n\\nMensagens do mentorado (em ordem cronológica):',
  'Especialista: injeta brief no userPrompt'
);
replaceOnce(
  espNode, 'jsCode',
  'duvida_resumida: duvidaResumida,',
  'duvida_resumida: duvidaResumida,\n    contexto_brief: original.contexto_brief || "",',
  'Especialista: carrega contexto_brief adiante'
);

// ============================================================
//  5) PERFIL — roda no Haiku (brief carregado via ...original)
// ============================================================
const perfilNode = getNode('Parse Especialista + MR Perfil');
replaceOnce(
  perfilNode, 'jsCode',
  "model: 'claude-sonnet-4-6'",
  "model: '" + HAIKU + "'",
  'Perfil: troca modelo para Haiku'
);

// ============================================================
//  6) REDATOR — recebe o brief de continuidade
// ============================================================
const redatorNode = getNode('Montar Request: Redator');
replaceOnce(
  redatorNode, 'jsCode',
  'CONTEÚDO DO ESPECIALISTA (',
  'BRIEF DE CONTEXTO (continuidade, nao repita saudacao, retome o que ja foi dito):\\n"""\\n${original.contexto_brief || "(sem contexto)"}\\n"""\\n\\nCONTEÚDO DO ESPECIALISTA (',
  'Redator: injeta brief de continuidade'
);

// ============================================================
//  7) BUSCAR CONVERSAS — passa a trazer o historico recente
// ============================================================
const buscarNode = getNode('Buscar Conversas Nao Lidas');
replaceOnce(
  buscarNode, 'query',
  '  ultima_mensagem_em\nFROM v_unread_conversations;',
  '  ultima_mensagem_em,\n  get_conversation_context(whatsapp_number, 12) AS historico_recente\nFROM v_unread_conversations;',
  'Buscar Conversas: adiciona coluna historico_recente'
);

// ============================================================
//  INSERE OS NÓS NOVOS
// ============================================================
wf.nodes.push(inserirOutgoing, montarContexto, apiContexto);

// ============================================================
//  RELIGAÇÃO DAS CONEXÕES
// ============================================================
const C = wf.connections;

// 2a) Geração: Tem conversas? -> Contexto -> API: Contexto -> Roteador
assert(
  C['Tem conversas?'].main[0][0].node === 'Montar Request: Roteador',
  'conexão inesperada em "Tem conversas?"'
);
C['Tem conversas?'].main[0] = [{ node: 'Montar Request: Contexto', type: 'main', index: 0 }];
C['Montar Request: Contexto'] = { main: [[{ node: 'API: Contexto', type: 'main', index: 0 }]] };
C['API: Contexto'] = { main: [[{ node: 'Montar Request: Roteador', type: 'main', index: 0 }]] };

// 1a) Outgoing: Incoming ou Outgoing? (falso) -> Inserir Outgoing -> Marcar Lida
assert(
  C['Incoming ou Outgoing?'].main[1][0].node === 'Marcar Conversa como Lida',
  'conexão inesperada na saída "outgoing"'
);
C['Incoming ou Outgoing?'].main[1] = [{ node: 'Inserir Mensagem Outgoing', type: 'main', index: 0 }];
C['Inserir Mensagem Outgoing'] = { main: [[{ node: 'Marcar Conversa como Lida', type: 'main', index: 0 }]] };

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

// round-trip JSON
const out = JSON.stringify(wf, null, 2);
JSON.parse(out); // sanity

fs.writeFileSync(WF, out + '\n');

console.log('OK — workflow atualizado.');
console.log('Nós agora:', wf.nodes.length);
console.log('Novos nós: Inserir Mensagem Outgoing, Montar Request: Contexto, API: Contexto');
