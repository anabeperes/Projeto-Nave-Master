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

## ⏳ Incremento 2 — Suporte completo + Eventos (PRÓXIMO)

- Portar as skills de suporte que já existem no repo (`cancelamento`,
  `congelamento`, `reclamacao`, `padroes`) para o nó de Suporte — hoje o
  workflow só tem 8 intenções fixas embutidas.
- Adicionar a categoria **EVENTOS** (e dúvidas sobre entregas/metodologia) ao
  Roteador, hoje limitado a SUPORTE/TRÁFEGO/COPY/FEEDBACK.

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
