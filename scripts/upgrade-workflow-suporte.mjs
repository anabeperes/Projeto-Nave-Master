// ============================================================
//  Incremento 2 — Suporte em dois passos + skills + voz
// ------------------------------------------------------------
//  Transforma "Workflow dash.json" de forma determinística:
//   1. O Roteador passa a classificar também o SUB-TIPO de SUPORTE.
//   2. Para SUPORTE, o Especialista recebe SÓ a skill do sub-tipo
//      (as skills do repo, lidas de .claude/skills/nave-suporte/).
//      Caso sensível (cancelamento/congelamento/reclamação) vem junto,
//      porque os três se interligam.
//   3. O Redator ganha as Regras de Comunicação (sem travessão nem
//      hífen duplo, prosa sem listas, sem jargão de IA, voz de parceira).
//
//  NÃO adiciona nós novos nem reconecta nada: só altera 3 nós de código.
//  Isso reduz o risco (não dá para testar n8n daqui) mantendo o resultado
//  escolhido: "escolher a skill primeiro, usar só aquele material".
//
//  Roda com: node scripts/upgrade-workflow-suporte.mjs
//  Lê e reescreve "Workflow dash.json". Idempotente: aborta se já aplicado.
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

// idempotência
assert(
  !getNode('Parse Roteador + MR Especialista').parameters.jsCode.includes('suporteBuckets'),
  'Workflow já parece ter o Incremento 2 (suporteBuckets existe). Abortando.'
);

// substituição única com replacement LITERAL (função evita interpretação de $ pelo String.replace)
function injectOnce(node, field, search, replacement, label) {
  const before = node.parameters[field];
  assert(typeof before === 'string', `${label}: campo ${field} não é string`);
  assert(before.includes(search), `${label}: trecho esperado não encontrado -> ${JSON.stringify(search).slice(0, 90)}`);
  const after = before.replace(search, () => replacement);
  assert(after !== before, `${label}: replace não alterou nada`);
  node.parameters[field] = after;
}

// --- skills do repo (fonte de verdade) --------------------------------------
const stripFM = (md) => md.replace(/^---[\s\S]*?---\s*/, '').trim();
const sk = (file) => {
  const txt = stripFM(fs.readFileSync(path.join(root, '.claude/skills/nave-suporte', file), 'utf8'));
  assert(txt.length > 200, 'skill vazia/curta: ' + file);
  return txt;
};

const cancelamento = sk('cancelamento.md');
const congelamento = sk('congelamento.md');
const reclamacao = sk('reclamacao.md');

const sensivel = [
  '# Suporte sensível — retenção e bem-estar do mentorado',
  '',
  'Este é um caso sensível. A mensagem pode ser pedido de cancelamento, pedido de pausa (congelamento) ou reclamação/insatisfação, e esses casos se interligam: quem quer cancelar por motivo de saúde, falecimento ou divórcio tem direito a congelamento; quem quer cancelar por dinheiro vai para o financeiro com a Lya; quem está insatisfeito é reclamação.',
  '',
  'Primeiro identifique qual dos três se aplica e siga a skill correspondente abaixo. Se o caso migrar de um para outro, use o conteúdo da skill de destino. Entregue o output no formato definido pela skill que você aplicar.',
  '',
  '---',
  '',
  '## SKILL: CANCELAMENTO',
  '',
  cancelamento,
  '',
  '---',
  '',
  '## SKILL: CONGELAMENTO',
  '',
  congelamento,
  '',
  '---',
  '',
  '## SKILL: RECLAMAÇÃO',
  '',
  reclamacao
].join('\n');

const suporteBuckets = {
  PADROES: sk('padroes.md'),
  FLUXER: sk('fluxer.md'),
  ANALISE: sk('analise-plano-acao.md'),
  FINANCEIRO: sk('financeiro.md'),
  FLUXO_CRIATIVO: sk('fluxo-criativo.md'),
  RELACIONAMENTO: sk('relacionamento.md'),
  SENSIVEL: sensivel
};

// ============================================================
//  1) ROTEADOR — classifica também o SUB-TIPO de SUPORTE
// ============================================================
const rotNode = getNode('Montar Request: Roteador');
const mRot = rotNode.parameters.jsCode.match(/const systemPrompt = ("(?:[^"\\]|\\.)*");/);
assert(mRot, 'systemPrompt do Roteador não encontrado');
const rotSys = JSON.parse(mRot[1]);
assert(rotSys.includes('Agente Roteador'), 'prompt do Roteador inesperado');
assert(!rotSys.includes('SUBTIPO'), 'Roteador já tem SUBTIPO (já aplicado?)');

const subtipoSection = `

## Sub-tipo de SUPORTE (preencher SOMENTE quando CATEGORIA = SUPORTE)

Quando a categoria for SUPORTE, identifique também o sub-tipo, para o sistema usar só o material certo. Escolha exatamente um:

- PADROES: como a mentoria funciona, boas-vindas, primeiros passos, Ajuste de Velas, primeira reunião, papel do navegador, comunidade, eventos e retiros (logística), newsletter, PIF (indicações), problema em ferramenta externa (Meta, Hotmart, YouTube), atualizar dados do negócio.
- FLUXER: acesso e uso da plataforma Fluxer (login, e-mail de acesso, achar aula, entregar tarefa, mudar de nível, editar projeto, Fluxer IA) e plataforma fora do ar ou link que não carrega.
- ANALISE: fluxo de análise e plano de ação (prazo do plano, gravação, link da análise ou da reunião, agendas não liberadas, remarcar, análise cancelada, analisador não apareceu).
- FINANCEIRO: pagamento, boleto, parcelamento, nota fiscal, cobrança indevida, valor da cobrança, mudar a data de pagamento.
- SENSIVEL: quer cancelar ou sair, quer pausar por saúde, falecimento ou divórcio, ou está insatisfeito e reclamando do Fluxo, de uma entrega ou do atendimento.
- FLUXO_CRIATIVO: dúvida sobre o evento Fluxo Criativo, uso do Claude Code, criar anúncios, páginas ou campanhas pelos agentes, ou senha dos agentes.
- RELACIONAMENTO: vínculo e motivação, sem ser problema técnico nem reclamação: sumiu e voltou, comemorando uma conquista, desanimado com o próprio processo, pensando em mudar de nicho, pedindo extensão de prazo, pedindo indicação de ferramenta, perguntando sobre bônus.

Regra de desempate: se a pessoa responsabiliza o Fluxo, quer sair ou quer pausar, é SENSIVEL. Se é desânimo, comemoração ou dúvida leve sem culpar o Fluxo, é RELACIONAMENTO. Se é acesso ou uso da plataforma, é FLUXER. Se é prazo, agenda ou gravação de análise, é ANALISE.

## Formato de resposta (obrigatório, exatamente estes campos, sem texto adicional)

CATEGORIA: [SUPORTE | TRÁFEGO | COPY | FEEDBACK]
SUBTIPO: [PADROES | FLUXER | ANALISE | FINANCEIRO | SENSIVEL | FLUXO_CRIATIVO | RELACIONAMENTO | nao_aplica]
URGENCIA: [ALTA | MEDIA | BAIXA]
CONFIANCA: [ALTA | MEDIA | BAIXA]
MOTIVO: [1 linha explicando categoria, sub-tipo e urgência]
DUVIDA_RESUMIDA: [a dúvida do mentorado em 1 linha direta]

Se CATEGORIA não for SUPORTE, use SUBTIPO: nao_aplica.`;

rotNode.parameters.jsCode = rotNode.parameters.jsCode.replace(mRot[1], () => JSON.stringify(rotSys + subtipoSection));
injectOnce(rotNode, 'jsCode', 'max_tokens: 256', 'max_tokens: 400', 'Roteador: aumenta max_tokens para caber o SUBTIPO');

// ============================================================
//  2) ESPECIALISTA — para SUPORTE usa SÓ a skill do sub-tipo
// ============================================================
const espNode = getNode('Parse Roteador + MR Especialista');

injectOnce(
  espNode, 'jsCode',
  "const confianca = parseField('CONFIANCA').toUpperCase().split(' ')[0] || 'MEDIA';",
  "const confianca = parseField('CONFIANCA').toUpperCase().split(' ')[0] || 'MEDIA';\n" +
  "const subtipo = parseField('SUBTIPO').toUpperCase().split(' ')[0] || 'PADROES';",
  'Especialista: parse do SUBTIPO'
);

injectOnce(
  espNode, 'jsCode',
  "const systemPrompt = specialistPrompts[categoria] || specialistPrompts['SUPORTE'];",
  'const suporteBuckets = ' + JSON.stringify(suporteBuckets) + ';\n' +
  "const systemPrompt = categoria === 'SUPORTE'\n" +
  "  ? (suporteBuckets[subtipo] || suporteBuckets['PADROES'])\n" +
  "  : (specialistPrompts[categoria] || suporteBuckets['PADROES']);",
  'Especialista: seleciona a skill de suporte pelo sub-tipo'
);

// ============================================================
//  3) REDATOR — Regras de Comunicação (proibições + voz)
// ============================================================
const redNode = getNode('Montar Request: Redator');

injectOnce(
  redNode, 'jsCode',
  '- Travessão (—) em qualquer parte do texto',
  '- Travessão (—) em qualquer parte do texto\\n' +
  '- Hífen duplo (--) como substituto de travessão. Trocar por vírgula, ponto, dois pontos ou parênteses\\n' +
  '- Listas com marcadores ou bullet points. A mensagem de WhatsApp é em prosa, em frases corridas (única exceção: o FEEDBACK detalhado, que pode usar blocos espaçados)\\n' +
  '- Jargão de robô ou de IA: "posso te ajudar com isso", "fico à disposição", "espero ter ajudado", "claro!", "certamente", "com prazer"',
  'Redator: regras de comunicação (proibições)'
);

injectOnce(
  redNode, 'jsCode',
  '- Nunca condescendente',
  '- Nunca condescendente\\n' +
  '- Linguagem natural, conversacional e brasileira, de parceira próxima que está do lado\\n' +
  '- Emoji com naturalidade quando o mentorado for caloroso ou usar emoji (um leve e natural, como 😂). Se o mentorado não usa emoji, não forçar\\n' +
  '- Fechamento orgânico, sem despedida padronizada',
  'Redator: voz da navegadora'
);

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

// checagens de conteúdo
assert(espNode.parameters.jsCode.includes('suporteBuckets[subtipo]'), 'seleção por subtipo não aplicada');
assert(getNode('Montar Request: Roteador').parameters.jsCode.includes('SUBTIPO:'), 'SUBTIPO não entrou no Roteador');
assert(redNode.parameters.jsCode.includes('Hífen duplo'), 'regras de comunicação não aplicadas no Redator');

const out = JSON.stringify(wf, null, 2);
JSON.parse(out); // sanity round-trip
fs.writeFileSync(WF, out + '\n');

console.log('OK — workflow atualizado (Incremento 2).');
console.log('Nós:', wf.nodes.length, '(sem nós novos)');
console.log('Skills de suporte embutidas:', Object.keys(suporteBuckets).join(', '));
