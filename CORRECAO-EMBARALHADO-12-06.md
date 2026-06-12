# Correção — mensagens embaralhadas entre os navegadores (12/06)

Sintoma: o WF do dash ativo, mas cada navegador via mensagens dos outros.
O esperado:

| Navegador | Vê só a instância |
|---|---|
| Manu | `manu` |
| Ana | `wa2` |
| Robson | `Robson` |
| Lívia | `Livia` |
| Ruam | `Ruan` |
| Darah | `Darah` |
| Felipe | `Felipe` |

## Causa (conferida no banco em 12/06)

1. A trava (RLS) das **sugestões** herdava o dono pelo **número do mentorado**
   via tabela `messages`. Como o histórico antigo (3.173 mensagens) era todo
   da `wa2` e havia mentorados com mensagem em mais de uma instância, a mesma
   sugestão aparecia no painel de vários navegadores.
2. **1.022 mensagens com o carimbo corrompido** pelo bug da vírgula do
   WF-10/06 (pedaços de mensagem e IDs no campo `instancia`). O lixo parou em
   11/06 17:20, quando o WF-11/06 assumiu.
3. A sugestão era gravada **sem carimbo próprio** (o nó "Salvar Sugestao no
   Painel" não enviava `instancia`).
4. Bônus de segurança: políticas **"permitir select/insert/update anon"** em
   `sugestoes`/`contacts`/`relatorios_diarios` — qualquer pessoa com a chave
   pública (que está no HTML do painel) lia e editava tudo sem login. Foram
   criadas como atalho para o n8n gravar sem a chave secreta.

## O que JÁ FOI FEITO (executado direto no banco em 12/06)

`supabase/passo7-sugestoes-por-instancia.sql` — **já executado**:

- Carimbos corrompidos limpos (1.022 viraram NULL).
- Coluna `sugestoes.instancia` criada e **todas as sugestões carimbadas**
  retroativamente com o dono atual (instância da mensagem válida mais recente
  do mentorado, em qualquer direção).
- **Gatilho no banco**: toda sugestão nova sem carimbo ganha o dono atual
  automaticamente — o WF-11/06 atual já grava separado, sem mudar nada.
- Trava nova: cada navegador vê/edita **só sugestão da sua instância**; a aba
  Métricas (contatos) segue a mesma regra do dono atual.
- Mapa login → instância conferido: os 7 vínculos corretos.

**Validação feita** (simulando o login no banco): Manu vê só `manu`
(48 pendentes), Ana vê só `wa2` (52), Robson vê só `Robson` (11). Sobraram 6
sugestões antigas de contatos `@lid` sem nenhuma mensagem carimbada —
invisíveis para todos; voltam ao painel certo quando o mentorado escrever
de novo.

## O que AINDA FALTA (2 passos, nesta ordem)

1. **n8n:** importar `WF-12-06.json` (colar a chave secreta `sb_secret_...`
   nos nós "Configurar Supabase" e "Configurar Supabase 18h" — no JSON do
   repositório está o placeholder), conferir credenciais de Postgres,
   **ativar o WF-12/06 e desativar o WF-11/06**. Mudanças dele:
   - busca e propaga a `instancia` da conversa até o "Salvar Sugestao";
   - os 4 nós HTTP do Supabase (Salvar Sugestao, Buscar Sugestoes Existentes,
     Arquivar Sugestao Antiga, Salvar Relatorio) não dependem mais da
     credencial "Header Auth account 2": usam cabeçalhos explícitos com a
     chave dos nós "Configurar Supabase" (a secreta).
2. **Supabase:** rodar `supabase/passo8-fechar-anon.sql` para remover as
   políticas anon. ⚠️ Só depois do WF-12/06 ativo — antes disso o n8n (chave
   pública) pararia de salvar.

## Observações

- Se um mentorado falar com duas naves, vale a **última**: o dono é a
  instância da mensagem válida mais recente (qualquer direção).
- A Ana deixa de ver o aglomerado: mentorado com histórico antigo `wa2` que
  hoje fala com outra nave aparece **só** na nave atual.
- Os nomes de instância são exatos (`wa2`, `manu`, `Darah`, `Livia`,
  `Felipe`, `Ruan`, `Robson`); instância nova na Evolution precisa entrar na
  lista da função `dono_atual` e no nó "Buscar Conversas Nao Lidas".
