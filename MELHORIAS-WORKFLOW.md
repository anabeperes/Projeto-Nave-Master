# Melhorias do Workflow — registro e roteiro

Plano para o workflow de CS (`Workflow dash.json`) entregar sempre a melhor
sugestão possível. Dividido em incrementos pequenos e testáveis. Cada incremento
é gerado por um script determinístico em `scripts/` (o script é o registro
auditável da mudança) e deixa o workflow importável no n8n.

---

## ✅ Incremento 1 — Contexto da conversa + histórico (FEITO)

**Problema que resolve:** o workflow respondia enxergando só as mensagens não
lidas do mentorado, sem o histórico nem o fio da conversa. Mensagens como "pode
seguir" ou "tá ok" eram classificadas e respondidas no escuro, e o redator
podia cumprimentar de novo ou reexplicar algo já dito.

**O que mudou:**

1. **Persistência de `outgoing`.** As respostas enviadas pelo navegador agora
   são gravadas na tabela `messages` (novo nó *Inserir Mensagem Outgoing*).
   Antes, só as mensagens recebidas eram salvas — o histórico das respostas se
   perdia. A partir de agora a conversa completa fica registrada.

2. **Agente de Contexto (passo 0).** Novos nós *Montar Request: Contexto* e
   *API: Contexto* rodam o `nave-contexto` no início da geração. Ele lê o
   histórico recente + a mensagem atual e produz um *brief de contexto*
   (pergunta em aberto, loop pendente, interpretação real, instrução de
   continuidade, alertas).

3. **Brief injetado na cadeia toda.** O brief de contexto agora entra no
   **Roteador** (classifica melhor mensagens ambíguas), no **Especialista** e no
   **Redator** (continuidade: não repetir saudação, retomar o assunto).

4. **Histórico no banco.** A query *Buscar Conversas Nao Lidas* passou a trazer
   uma coluna `historico_recente` via a função `get_conversation_context`
   (últimas 12 mensagens já tratadas, rotuladas como `[mentorado]`/`[navegador]`).

5. **Modelo por tarefa.** Contexto, Roteador e Perfil passaram a rodar no
   **Haiku 4.5** (classificação simples, mais rápido e barato). Especialista e
   Redator seguem no **Sonnet 4.6**, onde a qualidade da escrita importa.

**Como aplicar:**

1. No **Supabase → SQL Editor**, rode `supabase/passo5-contexto-historico.sql`.
   (Cria a função `get_conversation_context`. É idempotente.)
2. No **n8n**, importe o `Workflow dash.json` atualizado (substitui o workflow
   atual). Confira que os nós Postgres e HTTP mantêm as credenciais corretas.
3. (Opcional) Para a Evolution mandar também as mensagens enviadas por você,
   garanta que o webhook de `messages.upsert` inclui eventos `fromMe = true` —
   é assim que o histórico de respostas vai sendo preenchido daqui pra frente.

> Observação: o histórico melhora com o tempo. Conversas antigas só passam a ter
> as respostas do navegador a partir de agora (quando o `outgoing` começa a ser
> gravado). As perguntas anteriores do mentorado que já estavam no banco já
> entram no histórico desde o primeiro dia.

---

## ✅ Incremento 2 — Suporte completo + Eventos (FEITO)

**Problema que resolve:** o prompt de SUPORTE no workflow estava degradado —
só 8 intenções fixas embutidas, sem as demandas sensíveis (cancelamento,
congelamento, reclamação) que já existiam como skills ricas no repo. E o
Roteador não tinha lugar para dúvidas sobre eventos, comunidade ou
metodologia/entregas: tudo caía em SUPORTE no escuro.

**O que mudou:**

1. **SUPORTE completo.** O prompt de SUPORTE passou a carregar, verbatim, o
   conteúdo canônico das skills do repo (zero paráfrase):
   - `padroes.md` → base de "como funciona a mentoria" + 13 intenções
     operacionais (boas-vindas, primeiros passos, Ajuste de Velas, navegador,
     comunidade, eventos, newsletter, PIF, ferramentas externas, etc.).
   - `cancelamento.md`, `congelamento.md`, `reclamacao.md` → os três playbooks
     de demandas sensíveis, com suas árvores de decisão e tom obrigatório.
   Um cabeçalho roteia internamente: o especialista escolhe UM playbook
   (operacional, cancelamento, congelamento ou reclamação) e responde no
   formato dele.

2. **Categoria EVENTOS.** Nova entrada no mapa `specialistPrompts` e nova
   categoria no Roteador, para eventos/retiros, comunidade, newsletter, PIF e
   dúvidas informativas de metodologia/entregas (níveis da trilha, linha do
   tempo, o que é cada entrega). Reaproveita o mesmo nó `API: Especialista`
   (nenhum nó novo). A descrição de SUPORTE no Roteador passou a citar
   explicitamente cancelamento/congelamento/reclamação, e o enum de
   `CATEGORIA` ganhou EVENTOS nos dois blocos de formato.

**Decisão de escopo (SUPORTE × EVENTOS):** SUPORTE cobre o operacional e o
sensível ("algo travou", "quero sair", "estou insatisfeito"); EVENTOS cobre o
informativo sobre o programa ("como funciona", "quando é o evento", "o que é o
Ajuste de Velas"). Há sobreposição proposital na base de conhecimento
(`padroes`) — se o Roteador errar o destino, os dois lados ainda têm a
resposta. O `cache_control: ephemeral` mantém o custo baixo apesar dos prompts
maiores.

**Como aplicar:** reimportar o `Workflow dash.json` atualizado no n8n
(substitui o atual). Nenhuma mudança de banco ou de credenciais.

> Skills ainda não portadas (candidatas a um próximo incremento ou ao RAG):
> `fluxer`, `financeiro`, `analise-plano-acao`, `fluxo-criativo`.

## ⏳ Incremento 3 — Qualidade e atualização

- **Verificador de guardrails** após o Redator (travessão, "!", pedidos de
  desculpa, frases que põem o Fluxo como réu) com correção/sinalização.
- **Regerar a sugestão** quando chegam mensagens novas, em vez de pular a
  conversa só porque já existe uma sugestão pendente (que pode estar desatualizada).

## ⏳ Incremento 4 — Metodologia do Fluxo (RAG)

- Indexar os documentos de tráfego e copy da Fernanda (pgvector no Supabase) e
  recuperar os trechos relevantes no Especialista, para responder sempre dentro
  da metodologia — não com marketing genérico. É o maior salto de qualidade.

---

### Scripts

| Script | O que faz |
|---|---|
| `scripts/upgrade-workflow-ctx.mjs` | Aplica o Incremento 1 ao `Workflow dash.json` (determinístico, valida cada passo e a sintaxe de cada nó). |
| `scripts/upgrade-workflow-suporte-eventos.mjs` | Aplica o Incremento 2: SUPORTE completo (padroes + cancelamento + congelamento + reclamação, lidos das skills) e categoria EVENTOS no Roteador e no mapa de especialistas. Idempotente. |
