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

## ✅ Incremento 2 — Suporte em dois passos + skills + voz (FEITO)

**Problema que resolvia:** o nó de SUPORTE tinha só 8 intenções fixas embutidas.
As skills ricas do repo (cancelamento, congelamento, reclamação, financeiro,
fluxer, análise/plano, padrões, fluxo criativo) ficavam de fora, e dúvidas de
eventos/entregas caíam no improviso. Tráfego/copy seguem para o Incremento 4.

**O que mudou:**

1. **Roteador escolhe a skill primeiro.** Quando classifica SUPORTE, ele também
   define o **sub-tipo** (PADROES, FLUXER, ANALISE, FINANCEIRO, SENSIVEL,
   FLUXO_CRIATIVO, RELACIONAMENTO). Sem nós novos: a classificação dupla acontece
   na mesma chamada (Haiku), com `max_tokens` ajustado.
2. **Especialista usa só o material do sub-tipo.** Para SUPORTE, o system prompt
   passa a ser a skill daquele tema (lida de `.claude/skills/nave-suporte/`).
   O caso **SENSIVEL** recebe cancelamento + congelamento + reclamação juntos,
   porque se interligam (ex.: cancelar por saúde vira congelamento).
3. **Eventos cobertos sem categoria nova.** Logística de eventos/retiros está em
   `padroes`; o evento de IA (Fluxo Criativo) tem skill própria.
4. **Nova skill `relacionamento`.** Mentorado que voltou, comemoração, desânimo,
   mudar de nicho, extensão de prazo, indicação de ferramenta e bônus.
5. **Regras de Comunicação no Redator.** Proíbe travessão e hífen duplo, listas
   com marcadores (prosa no WhatsApp, exceto FEEDBACK), jargão de IA; reforça a
   voz de parceira brasileira e o uso natural de emoji.

**Como aplicar:** importe o `Workflow dash.json` atualizado no n8n. Nenhuma
migração de banco é necessária neste incremento.

> A separação por sub-tipo é uma classificação a mais do Haiku, então não há nós
> novos nem reconexões (mais seguro, já que não dá para testar n8n daqui).

## ✅ Incremento 2.5 — Fluxos de COPY, TRÁFEGO e FEEDBACK (FEITO)

**Problema que resolvia:** as três categorias respondiam fora do fluxo real da
navegadora. FEEDBACK gerava uma crítica VTSD na hora (quem revisa é o time de
copy, em até 4 dias úteis), e avisos de "vou criar minha página" ou "vou subir
campanha" caíam em resposta de metodologia em vez de incentivo.

**O que mudou:**

1. **FEEDBACK vira intake.** Recebe o pedido, identifica o material (PV, anúncio,
   quiz cobertos; e-book/curso/produto não cobertos) e monta a mensagem de
   encaminhamento ao time de copy com prazo de 4 dias úteis. A crítica VTSD
   detalhada segue documentada em `.claude/skills/nave-especialista-feedback/`.
2. **COPY e TRÁFEGO leem o momento.** `VAI_FAZER` parabeniza e incentiva a
   execução; `JA_FEZ` em copy encaminha para o time, em tráfego pede a campanha
   exportada do gerenciador (perguntando se sabe baixar); `DUVIDA` responde o
   conceito direto.
3. **Roteador** ganhou uma nota: avisos de que ainda vai fazer algo vão para
   COPY/TRÁFEGO, não FEEDBACK.

Os prompts viraram fonte de verdade nos agentes canônicos
(`.claude/agents/nave-especialista-copy.md`, `-trafego.md`, `-feedback.md`) e o
script os lê de lá. Sem nós novos.

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
| `scripts/upgrade-workflow-suporte.mjs` | Aplica o Incremento 2: sub-tipo de SUPORTE no Roteador, seleção da skill no Especialista (lê as skills de `.claude/skills/nave-suporte/`) e Regras de Comunicação no Redator. Idempotente, valida sintaxe + JSON. |
| `scripts/upgrade-workflow-fluxos.mjs` | Aplica o Incremento 2.5: FEEDBACK vira intake e COPY/TRÁFEGO passam a ler o momento (lê os prompts de `.claude/agents/`). Rode depois do de suporte. Idempotente, valida sintaxe + JSON. |
