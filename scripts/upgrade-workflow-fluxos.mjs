// ============================================================
//  Incremento 2.5 — Fluxos de COPY, TRÁFEGO e FEEDBACK
// ------------------------------------------------------------
//  Transforma "Workflow dash.json" de forma determinística:
//   - FEEDBACK vira intake: "manda que encaminho pro time de copy,
//     devolutiva em até 4 dias úteis" (e "não cobrimos" para material
//     de produto). Não gera mais a crítica VTSD na hora.
//   - COPY e TRÁFEGO passam a ler o MOMENTO do mentorado:
//       VAI_FAZER  -> parabenizar e incentivar a fazer
//       JA_FEZ     -> copy: encaminhar pro time; tráfego: pedir a
//                     campanha exportada do gerenciador e perguntar
//                     se sabe baixar
//       DUVIDA     -> resposta conceitual direta
//   - Roteador: nota deixando claro que avisos de "vou fazer" vão para
//     COPY/TRÁFEGO, não FEEDBACK.
//
//  Os prompts são lidos dos agentes canônicos (.claude/agents/), que
//  passam a ser a fonte de verdade. Só altera 2 nós de código, sem nós
//  novos nem reconexões. Roda com: node scripts/upgrade-workflow-fluxos.mjs
//  Idempotente: aborta se já aplicado.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WF = path.join(root, 'Workflow dash.json');

function assert(cond, msg) {
  if (!cond) throw new Error('ASSERT FALHOU: ' + msg);
}

const wf = JSON.parse(fs.readFileSync(WF, 'utf8'));
const byName = Object.fromEntries(wf.nodes.map((n) => [n.name, n]));
function getNode(name) {
  const n = byName[name];
  assert(n, 'nó não encontrado: ' + name);
  return n;
}

const espNode = getNode('Parse Roteador + MR Especialista');
assert(
  espNode.parameters.jsCode.includes('suporteBuckets'),
  'Rode antes o scripts/upgrade-workflow-suporte.mjs (Incremento 2).'
);
assert(
  !espNode.parameters.jsCode.includes('(intake)'),
  'Workflow já parece ter o Incremento 2.5 (feedback intake existe). Abortando.'
);

// --- prompts canônicos (fonte de verdade) -----------------------------------
const stripFM = (md) => md.replace(/^---[\s\S]*?---\s*/, '').trim();
const agent = (file, marker) => {
  const txt = stripFM(fs.readFileSync(path.join(root, '.claude/agents', file), 'utf8'));
  assert(txt.includes(marker), `${file}: marcador esperado não encontrado (${marker})`);
  return txt;
};

const copy = agent('nave-especialista-copy.md', 'MOMENTO:');
const trafego = agent('nave-especialista-trafego.md', 'gerenciador');
const feedback = agent('nave-especialista-feedback.md', '(intake)');

const newSpecialistPrompts = {
  'TRÁFEGO': trafego,
  'COPY': copy,
  'FEEDBACK': feedback
};

// ============================================================
//  1) ESPECIALISTA — troca o objeto specialistPrompts
// ============================================================
const reSpec = /const specialistPrompts = \{[\s\S]*?\};\n\nconst suporteBuckets =/;
assert(reSpec.test(espNode.parameters.jsCode), 'bloco specialistPrompts -> suporteBuckets não encontrado');
const novoBloco = 'const specialistPrompts = ' + JSON.stringify(newSpecialistPrompts) + ';\n\nconst suporteBuckets =';
espNode.parameters.jsCode = espNode.parameters.jsCode.replace(reSpec, () => novoBloco);

// ============================================================
//  2) ROTEADOR — nota: "vou fazer" vai para COPY/TRÁFEGO, não FEEDBACK
// ============================================================
const rotNode = getNode('Montar Request: Roteador');
const mRot = rotNode.parameters.jsCode.match(/const systemPrompt = ("(?:[^"\\]|\\.)*");/);
assert(mRot, 'systemPrompt do Roteador não encontrado');
const rotSys = JSON.parse(mRot[1]);
const fbAnchor = '- "Me dá um feedback", "o que você acha", "está bom assim?"';
assert(rotSys.includes(fbAnchor), 'âncora FEEDBACK do roteador não encontrada');
const newRotSys = rotSys.replace(
  fbAnchor,
  fbAnchor +
    '\n- Use FEEDBACK apenas quando o material JÁ existe e o mentorado quer avaliação. Avisos de que ainda VAI fazer algo vão para COPY ou TRÁFEGO.'
);
rotNode.parameters.jsCode = rotNode.parameters.jsCode.replace(mRot[1], () => JSON.stringify(newRotSys));

// ============================================================
//  VALIDAÇÃO
// ============================================================
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

assert(espNode.parameters.jsCode.includes('(intake)'), 'feedback intake não entrou');
assert(espNode.parameters.jsCode.includes('MOMENTO:'), 'momento de copy/tráfego não entrou');
assert(espNode.parameters.jsCode.includes('gerenciador'), 'regra de tráfego (gerenciador) não entrou');
assert(rotNode.parameters.jsCode.includes('ainda VAI fazer algo vão para COPY'), 'nota do roteador não entrou');

const out = JSON.stringify(wf, null, 2);
JSON.parse(out); // sanity
fs.writeFileSync(WF, out + '\n');

console.log('OK — workflow atualizado (Incremento 2.5).');
console.log('Nós:', wf.nodes.length, '(sem nós novos)');
console.log('Prompts trocados: TRÁFEGO, COPY, FEEDBACK (lidos de .claude/agents/).');
