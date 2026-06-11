# Correções dos bugs reportados pelos navegadores (testes de 10/06)

Diagnóstico feito sobre o `WF-10/06` + prints do Slack. As correções estão em
**3 lugares** e precisam ser aplicadas juntas:

| Onde | Arquivo | Como aplicar |
|---|---|---|
| n8n | `WF-11-06.json` | Importar como workflow novo, conferir credenciais, ativar e **desativar o WF-10/06** |
| Supabase | `supabase/passo6-correcoes-bugs.sql` | Colar no SQL Editor e RUN |
| Painel | `painel/index.html` | Publicar a versão nova (mesmo lugar de sempre) |

---

## Bug a bug: causa e correção

### 1. Mensagem apagada virou "[Imagem enviada pelo mentorado]" (Lívia)

**Causa:** dois problemas somados. (a) O WhatsApp mostra só "mensagem apagada"
— não dá pra saber o que era. Se a mentorada mandou uma **imagem** e apagou em
seguida, o webhook já tinha capturado a imagem (sem legenda → vira o
placeholder de imagem) e **o evento de apagar era ignorado** pelo workflow, então
o placeholder ficou no painel como se nada tivesse acontecido.

**Correção (WF-11-06):** o "Normalizar Payload" agora reconhece a revogação
(`protocolMessage REVOKE`) e um ramo novo ("E revogacao?" → "Marcar Mensagem
Apagada") atualiza o registro original no banco para
`[Mensagem apagada pelo mentorado]` — e tira a mensagem da fila de sugestões.

### 2. Cartões duplicados/presos do Igor Braga, 600h+ aguardando (Felipe)

**Causa:** mensagens antigas de teste ficaram paradas como `unread` no banco
(ninguém respondeu por um WhatsApp conectado à Evolution, então o
`mark_conversation_as_read` nunca disparou). Toda vez que a sugestão anterior
saía de "pendente", a rodada seguinte **regenerava um cartão novo** da mesma
conversa presa — por isso dois cartões com 603h e 643h (40h de diferença).
O sufixo `@lid` no número (`1339...@lid`) é um problema conhecido da Evolution
API (contatos com privacidade de número), que criava contato com identificador
quebrado em vez do telefone real.

**Correção:**
- *WF-11-06:* o filtro só gera sugestão se a conversa tem **mensagem mais nova
  que a última sugestão** daquele número — conversa presa sem novidade nunca
  mais regenera cartão. E o `@lid` agora é resolvido para o número real
  (campos `remoteJidAlt`/`senderPn` da Evolution) quando disponível.
- *SQL (passo 6, bloco 2):* limpeza das mensagens presas há mais de 7 dias e
  das sugestões pendentes duplicadas (blocos comentados — revisar e rodar).

### 3. Sistema lendo as mensagens que o navegador envia como mentorado (Felipe)

**Causa:** combinação do `@lid` (item 2) com **conversa consigo mesmo** — o
teste de mandar mensagem pro próprio número entra pelo webhook como se fosse
conversa com um contato, e o workflow não tinha guarda pra isso.

**Correção (WF-11-06):** o "Normalizar Payload" descarta mensagens em que o
contato é o **próprio dono da instância** (`conversa_propria`) e também os
Status/Stories (`status@broadcast`), que entravam como contato fantasma.
> ⚠️ Consequência para os testes: mandar mensagem pra si mesmo **não gera mais
> cartão** (de propósito). Para testar, usem um segundo número.

### 4. Relatório de Hoje com o aglomerado de TODOS os navegadores (quase todos)

**Causa:** o relatório das 18h chama `get_daily_stats()`, que soma o banco
**inteiro** (sem separar por instância), e a tabela `relatorios_diarios` tinha
política de leitura "todo mundo vê tudo". Resultado: 99 mensagens, 41
mentorados e "A Bola de Cristal Astrologia" no relatório de todo mundo.

**Correção:**
- *SQL (passo 6, bloco 1):* função nova `get_daily_stats_por_instancia()` (uma
  linha por navegador), coluna `instancia` em `relatorios_diarios` e trava
  (RLS) para cada um ver só o seu relatório.
- *WF-11-06:* o "Buscar Stats do Dia" chama a função nova e o "Salvar
  Relatorio" grava uma linha por instância.

### 5. Números travados + mentorados depois das 10h não aparecem (Robson)

**Causa:** três problemas somados.
1. O **token de login do painel expira em ~1h** e o painel continuava usando o
   antigo: o "Marcar como enviada" passava a falhar **em silêncio** no banco
   (ficava só no navegador) — por isso os números travavam.
2. Com a sugestão presa como "pendente" no banco, o filtro do n8n **descartava
   toda mensagem nova** daquele mentorado (nunca aparecia cartão novo).
3. O agendamento dizia "9-17h BRT", mas o cron `0 12-20/2` rodava **de 2 em 2
   horas e no fuso do servidor** — dependendo do fuso do n8n, a manhã ficava
   sem rodada nenhuma.

**Correção:**
- *Painel:* o token agora é renovado automaticamente (acompanha o SDK).
- *WF-11-06:* filtro novo (item 2) — mensagem nova **sempre** gera sugestão
  nova, e a pendente velha é arquivada como `substituida` (o painel esconde).
- *WF-11-06:* timezone explícito `America/Sao_Paulo` no workflow + cron de
  hora em hora `0 9-17 * * 1-5` (e relatório `0 18 * * 1-5`).

### 6. Mensagem "quebrou" na vírgula (Manu / mentorado Yuri)

**Causa raiz (a mais importante):** no nó Postgres do n8n, os parâmetros da
query são um texto **separado por vírgulas**. Quando a mensagem do mentorado
tem vírgula ("teve uma live ontem, parece que foi sobre reels, ..."), o n8n
**fatia a mensagem nas vírgulas**: o conteúdo é salvo só até a primeira
vírgula e os pedaços seguintes vazam para os campos `evolution_msg_id` e
`instancia` (corrompendo dedupe e a separação por navegador). É bug conhecido
do n8n ([n8n#16354](https://github.com/n8n-io/n8n/issues/16354)).

**Correção (WF-11-06):** os 4 nós Postgres passaram a entregar os parâmetros
como **uma expressão única que devolve um array** (`{{ [a, b, c] }}`) — assim o
n8n não fatia nada e a mensagem chega inteira, com qualquer pontuação.
O SQL do passo 6 inclui um SELECT para encontrar as linhas já corrompidas.

---

## Checklist de implantação (nesta ordem)

1. **Supabase:** rodar `supabase/passo6-correcoes-bugs.sql` (RUN). Revisar os
   blocos comentados de limpeza (2b e 2c) e rodá-los depois de conferir.
2. **n8n:** importar `WF-11-06.json`; nos nós **"Configurar Supabase"** e
   **"Configurar Supabase 18h"**, colar a chave **service_role** real (no JSON
   está o placeholder `COLE_AQUI_SUA_SECRET_KEY`); conferir as credenciais de
   Postgres e Header Auth; **ativar o WF-11/06 e desativar o WF-10/06** (os
   dois ativos = mensagem duplicada no banco).
3. **Painel:** publicar o `painel/index.html` novo e pedir para os navegadores
   **recarregarem a página** (Ctrl+Shift+R).
4. **Conferir:** o SQL do passo 6 imprime no final (a) se a trava RLS está
   ligada em todas as tabelas e (b) os contatos `@lid` quebrados que sobraram.

## O que ainda depende de você (não deu pra ver daqui)

- A definição da **view `v_unread_conversations`** e das funções
  `get_daily_stats` / `mark_conversation_as_read` não está no repositório (só
  existe no Supabase). A função nova do relatório **pressupõe** que a tabela
  `messages` tem a coluna `created_at` — se o nome for outro, ajustar os 3
  pontos marcados no SQL. Para me enviar as definições e eu conferir:
  ```sql
  SELECT pg_get_viewdef('v_unread_conversations', true);
  SELECT pg_get_functiondef(oid) FROM pg_proc
   WHERE proname IN ('get_daily_stats', 'mark_conversation_as_read', 'upsert_contact');
  ```
- Confirmar qual **fuso horário** está configurado na instância do n8n
  (Settings → Timezone). Com o timezone agora fixado no próprio workflow, isso
  deixa de importar para estes agendamentos, mas vale conferir os outros.
