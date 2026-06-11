#!/usr/bin/env node
// Gera uma versão otimizada do "Workflow dash.json" que CORTA a chamada de IA do
// Perfil, fundindo a análise de perfil dentro da chamada do Roteador.
//
// Antes: Contexto -> Roteador -> Especialista -> Perfil -> Redator   (5 chamadas)
// Depois: Contexto -> Roteador(+Perfil) -> Especialista -> Redator   (4 chamadas)
//
// Tudo é feito por transformação programática para preservar os prompts verbatim.
// O arquivo original NÃO é alterado; a saída vai para um arquivo novo.

import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'Workflow dash.json';
const OUT = 'Workflow dash — otimizado (4 chamadas).json';

const wf = JSON.parse(readFileSync(SRC, 'utf8'));
const nodeByName = (name) => wf.nodes.find((n) => n.name === name);

function mustReplace(str, find, repl, label) {
  if (!str.includes(find)) {
    throw new Error(`[${label}] trecho não encontrado: ${find.slice(0, 80)}...`);
  }
  return str.split(find).join(repl);
}

// ---------------------------------------------------------------------------
// 1) Extrair o systemPrompt do Perfil (hoje embutido em "Parse Especialista + MR Perfil")
// ---------------------------------------------------------------------------
const oldPerfilNode = nodeByName('Parse Especialista + MR Perfil');
const oldCode = oldPerfilNode.parameters.jsCode;
const marker = 'const systemPrompt = `';
const start = oldCode.indexOf(marker) + marker.length;
const end = oldCode.indexOf('`;', start);
const perfilPrompt = oldCode.slice(start, end);
if (perfilPrompt.includes('`') || perfilPrompt.includes('${')) {
  throw new Error('Perfil prompt contém caractere que quebra a injeção.');
}
console.log(`Perfil systemPrompt extraído: ${perfilPrompt.length} chars`);

// ---------------------------------------------------------------------------
// 2) Injetar a 2ª tarefa (Perfil) no systemPrompt do "Montar Request: Roteador"
//    + subir o max_tokens (agora a resposta também traz o bloco de perfil)
// ---------------------------------------------------------------------------
const blocoPerfil =
  '\n\n' +
  '=====================================================\n' +
  '# SEGUNDA TAREFA — Perfil de comunicação do mentorado (responda na MESMA resposta)\n\n' +
  'Além de classificar a mensagem acima, analise o ESTILO DE COMUNICAÇÃO do mentorado ' +
  'com base nas mensagens dele. Esse perfil orienta o redator a escrever no mesmo tom. ' +
  'Siga as instruções abaixo:\n\n' +
  perfilPrompt +
  '\n\n' +
  '## Ordem e formato final da SUA resposta (OBRIGATÓRIO)\n' +
  '1) Primeiro, os campos da classificação, um por linha, exatamente como definido na primeira tarefa: ' +
  'CATEGORIA, SUBTIPO, URGENCIA, CONFIANCA, MOTIVO, DUVIDA_RESUMIDA.\n' +
  '2) Depois, uma linha em branco e então EXATAMENTE a marca abaixo, em uma linha sozinha:\n' +
  'PERFIL_ESTILO:\n' +
  '3) Logo após essa marca, escreva a análise de perfil (os campos TOM, ENERGIA, EMOJIS, TAMANHO, ESTILO, ' +
  'INSTRUÇÃO_PARA_REDATOR). Ignore qualquer instrução de cercas/aspas triplas: NÃO use blocos de código, ' +
  'coloque os campos do perfil diretamente após a marca PERFIL_ESTILO:. Não escreva nada depois do perfil.';

const rtNode = nodeByName('Montar Request: Roteador');
let rtCode = rtNode.parameters.jsCode;

// O systemPrompt do Roteador é uma string com aspas duplas terminando em `";`.
// Anexamos o bloco do Perfil concatenando uma nova string JS (com escape via JSON.stringify).
const appendJs = ' + ' + JSON.stringify(blocoPerfil);
rtCode = mustReplace(
  rtCode,
  'const systemPrompt = "',
  '__SP_OPEN__',
  'roteador-open'
);
// reabrir e injetar o append imediatamente antes do `";` que fecha o systemPrompt
rtCode = rtCode.replace('__SP_OPEN__', 'const systemPrompt = "');
// inserir o append antes do fechamento `";\n` do systemPrompt
const closeIdx = rtCode.indexOf('";', rtCode.indexOf('const systemPrompt = "'));
if (closeIdx === -1) throw new Error('Não achei o fechamento do systemPrompt do Roteador.');
rtCode = rtCode.slice(0, closeIdx + 1) + appendJs + rtCode.slice(closeIdx + 1);

// max_tokens 400 -> 600 (cabe roteamento + bloco de perfil)
rtCode = mustReplace(rtCode, 'max_tokens: 400', 'max_tokens: 600', 'roteador-maxtokens');
rtNode.parameters.jsCode = rtCode;

// ---------------------------------------------------------------------------
// 3) "Parse Roteador + MR Especialista": capturar o bloco PERFIL_ESTILO e
//    repassá-lo adiante como perfil_texto
// ---------------------------------------------------------------------------
const prNode = nodeByName('Parse Roteador + MR Especialista');
let prCode = prNode.parameters.jsCode;
prCode = mustReplace(
  prCode,
  "const duvidaResumida = parseField('DUVIDA_RESUMIDA');",
  "const duvidaResumida = parseField('DUVIDA_RESUMIDA');\n" +
    "const _pm = rawText.match(/PERFIL_ESTILO:\\s*([\\s\\S]*)$/);\n" +
    "const perfilEstilo = _pm ? _pm[1].trim() : '';",
  'parse-roteador-capture'
);
prCode = mustReplace(
  prCode,
  'duvida_resumida: duvidaResumida,',
  'duvida_resumida: duvidaResumida,\n    perfil_texto: perfilEstilo,',
  'parse-roteador-return'
);
prNode.parameters.jsCode = prCode;

// ---------------------------------------------------------------------------
// 4) Reaproveitar "Parse Especialista + MR Perfil" como "Parse Especialista"
//    (só faz o parse do especialista; o perfil já veio do Roteador)
// ---------------------------------------------------------------------------
oldPerfilNode.name = 'Parse Especialista';
oldPerfilNode.parameters.jsCode =
  "// Guard: se a API do especialista falhou ou veio vazia, propaga o erro\n" +
  "if ($json.error || !$json.content || !Array.isArray($json.content) || $json.content.length === 0) {\n" +
  "  const orig = $('Parse Roteador + MR Especialista').item?.json || {};\n" +
  "  return { json: { _api_error: true, error_detail: $json.error || 'resposta vazia', ...orig } };\n" +
  "}\n\n" +
  "// Guarda a resposta do especialista. O perfil de comunicacao ja veio junto do Roteador\n" +
  "// (campo perfil_texto), entao aqui nao ha mais chamada separada de Perfil.\n" +
  "const especialistaTexto = $json.content?.[0]?.text || '';\n" +
  "const original = $('Parse Roteador + MR Especialista').item.json;\n\n" +
  "return { json: { ...original, especialista_texto: especialistaTexto } };";

// ---------------------------------------------------------------------------
// 5) "Montar Request: Redator": ler perfil/especialista do item (sem chamada de Perfil)
// ---------------------------------------------------------------------------
const rdNode = nodeByName('Montar Request: Redator');
let rdCode = rdNode.parameters.jsCode;
// novo guard (o item de entrada agora vem de "Parse Especialista", sem .content)
rdCode = mustReplace(
  rdCode,
  "if ($json.error || !$json.content || !Array.isArray($json.content) || $json.content.length === 0) {\n  const orig = $('Parse Especialista + MR Perfil').item?.json || {};\n  return { json: { _api_error: true, error_detail: $json.error || 'resposta vazia', ...orig } };\n}",
  "if ($json._api_error || !$json.especialista_texto) {\n  return { json: { _api_error: true, error_detail: $json.error_detail || 'especialista vazio', ...$json } };\n}",
  'redator-guard'
);
rdCode = mustReplace(rdCode, 'const perfilResp = $json;', '// perfil ja vem no proprio item (perfil_texto)', 'redator-perfilResp');
rdCode = mustReplace(rdCode, "const original = $('Parse Especialista + MR Perfil').item.json;", 'const original = $json;', 'redator-original');
rdCode = mustReplace(rdCode, "const perfilTexto = perfilResp.content?.[0]?.text || '';", "const perfilTexto = $json.perfil_texto || '';", 'redator-perfilTexto');
rdNode.parameters.jsCode = rdCode;

// ---------------------------------------------------------------------------
// 6) Remover o nó "API: Perfil"
// ---------------------------------------------------------------------------
wf.nodes = wf.nodes.filter((n) => n.name !== 'API: Perfil');

// ---------------------------------------------------------------------------
// 7) Religar conexões
//    - renomear "Parse Especialista + MR Perfil" -> "Parse Especialista" em todo lugar
//    - "Parse Especialista" passa a apontar para "Montar Request: Redator"
//    - remover conexoes de/para "API: Perfil"
// ---------------------------------------------------------------------------
const conns = wf.connections;

// rename key
if (conns['Parse Especialista + MR Perfil']) {
  conns['Parse Especialista'] = conns['Parse Especialista + MR Perfil'];
  delete conns['Parse Especialista + MR Perfil'];
}
// rename em todos os destinos
for (const src of Object.keys(conns)) {
  for (const out of Object.values(conns[src])) {
    for (const branch of out) {
      for (const c of branch) {
        if (c.node === 'Parse Especialista + MR Perfil') c.node = 'Parse Especialista';
      }
    }
  }
}
// "Parse Especialista" -> "Montar Request: Redator" (antes ia para "API: Perfil")
conns['Parse Especialista'] = { main: [[{ node: 'Montar Request: Redator', type: 'main', index: 0 }]] };
// remover saida de "API: Perfil"
delete conns['API: Perfil'];

// ---------------------------------------------------------------------------
// 8) Metadados + reposicionar o Redator para o espaço deixado pelo Perfil
// ---------------------------------------------------------------------------
wf.name = 'Workflow dash — otimizado (4 chamadas)';

// ---------------------------------------------------------------------------
// 9) Validações finais
// ---------------------------------------------------------------------------
const blob = JSON.stringify(wf);
for (const proibido of ['Parse Especialista + MR Perfil', 'API: Perfil']) {
  if (blob.includes(proibido)) throw new Error(`Referência remanescente a "${proibido}"`);
}
if (!nodeByName('Parse Especialista')) throw new Error('Nó "Parse Especialista" sumiu');
const especialistaOut = conns['API: Especialista'].main[0].map((c) => c.node);
if (!especialistaOut.includes('Parse Especialista')) throw new Error('API: Especialista não liga em Parse Especialista');
if (conns['Parse Especialista'].main[0][0].node !== 'Montar Request: Redator')
  throw new Error('Parse Especialista não liga em Montar Request: Redator');

writeFileSync(OUT, JSON.stringify(wf, null, 2) + '\n', 'utf8');
console.log(`OK -> "${OUT}"`);
console.log(`Nodes: ${wf.nodes.length} (era ${wf.nodes.length + 1})`);
