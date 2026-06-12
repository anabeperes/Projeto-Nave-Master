# Correções dos bugs reportados pelos navegadores (prints de 12/06)

Diagnóstico feito sobre os prints do Painel da Navegadora (Bruna Santos,
Aloha - Marcel, Marcio Lima, Paula Bucharles, A Bola de Cristal Astrologia).
As correções estão em **2 lugares** e precisam ser aplicadas juntas:

| Onde | Arquivo | Como aplicar |
|---|---|---|
| n8n | `WF-11-06.json` | Reimportar a versão nova, conferir credenciais, ativar e desativar a anterior |
| Supabase | `supabase/passo7-limpar-sugestoes-quebradas.sql` | Colar no SQL Editor, conferir a PRÉVIA e RUN |

---

## Bug a bug: causa e correção

### 1. Card mostrando "CATEGORIA: ... PERFIL_ESTILO: ... INSTRUÇÃO_PARA_REDATOR: ..." no lugar da resposta (Bruna Santos, Marcel, Marcio Lima, Paula Bucharles)

**Como reconhecer:** a sugestão é a saída CRUA do roteador (classificação +
perfil), e o card vem com os badges **MEDIA** e **NAO_MAPEADA** — que são os
valores de *fallback* usados quando o item chega ao fim da cadeia sem os
campos preenchidos (até a Bruna, que o roteador classificou como URGENCIA:
ALTA, aparece como MEDIA).

**Causa:** na versão do workflow que está rodando no n8n, quando a chamada do
**roteador falha** (ex.: API sobrecarregada), a guarda de erro **propagava** o
item para frente com `_api_error: true` em vez de descartá-lo. O item
propagado ainda carregava o `anthropic_body` da requisição do roteador, então
os nós seguintes ("API: Especialista" e "API: Redator") **re-enviavam o prompt
do roteador** para a API. A resposta nova (formato do roteador, sem o marcador
`RESPOSTA_FINAL:`) apagava a flag `_api_error`, passava pela guarda do
"Parse + Merge", e o *fallback* `sugestao_resposta = rawText` salvava o texto
bruto no painel.

**Correção (WF-11-06):** três barreiras.
- As guardas de erro da cadeia **descartam** o item (`return null`) em vez de
  propagá-lo — a conversa é reprocessada na rodada seguinte (isso já estava no
  WF-11-06 commitado em 11/06 à noite; se o n8n ainda roda a versão anterior,
  é por isso que os cards continuaram aparecendo).
- O "Parse + Merge" agora **exige o marcador `RESPOSTA_FINAL:`** — texto sem o
  marcador não é resposta do Redator e é descartado.
- Última barreira: mesmo dentro de `RESPOSTA_FINAL:`, se o texto contiver
  `CATEGORIA:`, `PERFIL_ESTILO:` ou `INSTRUÇÃO_PARA_REDATOR`, o item é
  descartado (saída intermediária da cadeia nunca vira card).

### 2. Card com "Parece que houve um problema no processamento — o conteúdo do especialista chegou vazio" (A Bola de Cristal Astrologia)

**Causa:** o especialista respondeu só com espaços/quebras de linha. A guarda
`!especialista_texto` deixa passar texto em branco (string com espaço é
"verdadeira" em JavaScript), então o Redator recebeu o conteúdo vazio e, sem
ter o que redigir, escreveu essa mensagem de erro — que foi salva como
sugestão.

**Correção (WF-11-06):** o "Parse Especialista" agora faz `trim()` na resposta
e **descarta** o item se ela ficar vazia; a guarda do "Montar Request:
Redator" também passou a tratar texto só de espaços como vazio.

### 3. Cards quebrados presos no painel (não se corrigem sozinhos)

**Causa:** o filtro "Filtrar Ja Sugeridas" (correto, criado no passo 6 para
acabar com os cards zumbis) só gera sugestão nova se a conversa tem mensagem
**mais nova** que a última sugestão. Como o card quebrado é a sugestão mais
recente daquele número, ele fica preso até o mentorado mandar outra mensagem.

**Correção (SQL passo 7):** apaga as sugestões pendentes quebradas (prévia
antes, DELETE depois). Sem a linha no banco, a próxima rodada do workflow
regenera a sugestão na hora — agora pela cadeia corrigida.

---

## Checklist de implantação (nesta ordem)

1. **n8n:** reimportar o `WF-11-06.json` novo; conferir nos nós "Configurar
   Supabase" / "Configurar Supabase 18h" a chave real; conferir credenciais de
   Postgres e Header Auth; **ativar a versão nova e desativar a anterior**
   (as duas ativas = mensagem duplicada no banco).
2. **Supabase:** rodar `supabase/passo7-limpar-sugestoes-quebradas.sql` —
   primeiro o bloco 1 (PRÉVIA) para conferir os cards que vão sair, depois o
   bloco 2 (DELETE).
3. **Conferir:** na próxima rodada cheia (agendamento de hora em hora, 9-17h),
   os mentorados afetados devem ganhar cards novos com resposta normal. Se um
   card não voltar, é porque a cadeia descartou o item por erro de API — ele
   tenta de novo na rodada seguinte.

## Comportamento esperado depois da correção

- Falhou qualquer etapa da cadeia (roteador, especialista ou redator)?
  O card **não aparece** naquela rodada e a conversa tenta de novo na
  próxima hora. Nunca mais card com texto interno da cadeia.
- O painel não precisa de mudança nesta rodada (`painel/index.html` segue
  igual).
