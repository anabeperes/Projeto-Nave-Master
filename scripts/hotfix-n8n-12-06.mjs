// Hotfix 12/06 — aplica direto no n8n (via API publica) as correcoes dos
// cards quebrados no painel, sem precisar reimportar o workflow:
//
//   1. Guardas de erro da cadeia descartam o item (nao propagam mais o
//      request do roteador para os nos seguintes — era isso que fazia a
//      saida crua "CATEGORIA: ... PERFIL_ESTILO: ..." virar sugestao).
//   2. Especialista em branco (so espacos) e descartado.
//   3. "Parse + Merge" exige o marcador RESPOSTA_FINAL e barra qualquer
//      vazamento de saida intermediaria.
//
// O patch e cirurgico (prepende guardas e troca 1 linha), entao funciona
// em qualquer versao do workflow (WF-10/06, WF-11/06 pre ou pos fix) e e
// idempotente: rodar de novo nao muda nada. Credenciais e chaves que ja
// estao no n8n nao sao tocadas.
//
// Uso (de uma maquina que alcanca o n8n):
//   N8N_URL=http://seu-n8n:5678 N8N_API_KEY=sua_chave node scripts/hotfix-n8n-12-06.mjs
//   (opcional: DRY_RUN=1 para so mostrar o que seria alterado)
//
// Depois de rodar: executar supabase/passo7-limpar-sugestoes-quebradas.sql
// para apagar os cards quebrados que ja estao no painel.

const RAW_URL = process.env.N8N_URL;
const KEY = process.env.N8N_API_KEY;
const DRY = process.env.DRY_RUN === '1';

if (!RAW_URL || !KEY || RAW_URL.includes('seu-n8n') || KEY === 'cole_aqui') {
  console.error('Defina N8N_URL e N8N_API_KEY. Ex.:');
  console.error('  N8N_URL=http://meu-n8n:5678 N8N_API_KEY=xxx node scripts/hotfix-n8n-12-06.mjs');
  process.exit(1);
}

const BASE = new URL(RAW_URL).origin + '/api/v1';
const H = { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' };
const api = async (path, opts = {}) => {
  const r = await fetch(BASE + path, { headers: H, ...opts });
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${path} -> HTTP ${r.status}: ${await r.text()}`);
  return r.json();
};

const MARK = '// [fix 12/06]';
const guards = {
  'Parse Roteador + MR Especialista':
    MARK + " descarta item com erro (nao propaga pela cadeia)\nif ($json.error || $json._api_error || !$json.content || !Array.isArray($json.content) || $json.content.length === 0) { return null; }\n",
  'Parse Especialista':
    MARK + " descarta erro/resposta em branco do especialista\nif ($json.error || $json._api_error || !$json.content || !Array.isArray($json.content) || $json.content.length === 0 || !((($json.content[0] || {}).text) || '').trim()) { return null; }\n",
  'Montar Request: Redator':
    MARK + " sem conteudo do especialista, descarta (reprocessa na proxima rodada)\nif ($json._api_error || !$json.especialista_texto || !String($json.especialista_texto).trim() || $json.especialista_texto === 'undefined') { return null; }\n",
};
const LINHA_ANTIGA = 'const sugestaoResposta = respostaMatch ? respostaMatch[1].trim() : rawText;';
const BLOCO_NOVO =
  MARK + " exige RESPOSTA_FINAL e barra vazamento da cadeia\n" +
  "if (!respostaMatch) { return null; }\n" +
  "const sugestaoResposta = respostaMatch[1].trim();\n" +
  "if (!sugestaoResposta || /^CATEGORIA:/m.test(sugestaoResposta) || sugestaoResposta.indexOf('PERFIL_ESTILO:') !== -1 || sugestaoResposta.indexOf('INSTRUÇÃO_PARA_REDATOR') !== -1) { return null; }";

function patchWorkflow(wf) {
  const mudancas = [];
  for (const node of wf.nodes || []) {
    const code = node.parameters && node.parameters.jsCode;
    if (!code) continue;
    if (guards[node.name] && !code.includes(MARK)) {
      node.parameters.jsCode = guards[node.name] + '\n' + code;
      mudancas.push(`${node.name} (guarda no topo)`);
    }
    if (node.name === 'Parse + Merge' && node.parameters.jsCode.includes(LINHA_ANTIGA)) {
      node.parameters.jsCode = node.parameters.jsCode.replace(LINHA_ANTIGA, BLOCO_NOVO);
      mudancas.push('Parse + Merge (exige RESPOSTA_FINAL)');
    }
  }
  return mudancas;
}

const lista = await api('/workflows?active=true&limit=250');
const ativos = lista.data || [];
console.log(`Workflows ativos: ${ativos.length}`);

let tocados = 0;
for (const resumo of ativos) {
  const wf = await api('/workflows/' + resumo.id);
  if (!(wf.nodes || []).some((n) => n.name === 'Parse + Merge')) continue;

  const mudancas = patchWorkflow(wf);
  if (!mudancas.length) {
    console.log(`= "${wf.name}" (id ${wf.id}): ja corrigido, nada a fazer.`);
    continue;
  }
  if (DRY) {
    console.log(`~ "${wf.name}" (id ${wf.id}) seria alterado:\n   - ${mudancas.join('\n   - ')}`);
    continue;
  }
  await api('/workflows/' + wf.id, {
    method: 'PUT',
    body: JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings || {} }),
  });
  const depois = await api('/workflows/' + wf.id);
  if (!depois.active) await api(`/workflows/${wf.id}/activate`, { method: 'POST' });
  console.log(`✔ "${wf.name}" (id ${wf.id}) atualizado e ativo:\n   - ${mudancas.join('\n   - ')}`);
  tocados++;
}
console.log(tocados ? `Concluido: ${tocados} workflow(s) corrigido(s).` : 'Concluido: nenhum workflow precisou de alteracao.');
