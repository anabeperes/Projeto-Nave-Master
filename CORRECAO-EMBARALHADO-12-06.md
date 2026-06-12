# Correção — mensagens embaralhadas entre os navegadores (12/06)

Sintoma reportado: o WF que coloca as sugestões no dash está ativo, mas cada
navegador via mensagens dos outros. O esperado:

| Navegador | Vê só a instância |
|---|---|
| Manu | `manu` |
| Ana | `wa2` |
| Robson | `Robson` |
| Lívia | `Livia` |
| Ruam | `Ruan` |
| Darah | `Darah` |
| Felipe | `Felipe` |

## Causa

A trava (RLS) das **sugestões** não olhava a sugestão em si — ela herdava o
dono pelo **número do mentorado** via tabela `messages`: "se existe mensagem
desse número na minha instância, a sugestão é minha". Dois fatos quebram essa
regra:

1. **Todo o histórico antigo foi carimbado como `wa2`** (passo 4, quando só o
   WhatsApp da Ana alimentava o n8n). Qualquer mentorado com mensagem antiga
   "pertence" também à Ana — o painel dela vira o aglomerado de todo mundo.
2. **Mentorado com mensagem em mais de uma instância** (trocou de nave, ou
   falou com dois WhatsApps) aparece no painel de todos esses navegadores.

Além disso, o nó **"Salvar Sugestao no Painel" gravava a sugestão sem o
carimbo** `instancia` — então não havia como filtrar direto.

## Correção (2 lugares, aplicar juntos)

| Onde | Arquivo | Como aplicar |
|---|---|---|
| n8n | `WF-12-06.json` | Importar como workflow novo, conferir credenciais, ativar e **desativar o WF-11/06** |
| Supabase | `supabase/passo7-sugestoes-por-instancia.sql` | Colar no SQL Editor e RUN |

O painel (`painel/index.html`) **não muda** — a separação é feita pela trava
no banco.

### O que o WF-12-06 muda (sobre o WF-11-06)

- **"Buscar Conversas Nao Lidas"**: além dos campos de sempre, busca a
  `instancia` da conversa (a da mensagem recebida mais recente do número).
- O carimbo atravessa a cadeia de agentes (Contexto → Roteador → Especialista
  → Redator → Parse + Merge).
- **"Salvar Sugestao no Painel"**: grava `instancia` em toda sugestão nova.

### O que o passo 7 muda no banco

- Coluna `sugestoes.instancia` + índice.
- **Carimba retroativamente** as sugestões existentes com o dono atual do
  mentorado (instância da última mensagem recebida dele).
- Trava nova: cada navegador vê/edita **só sugestão carimbada com a sua
  instância**. Sugestão sem carimbo não aparece para ninguém (antes aparecia
  para todos).
- Aba Métricas: o contato passa a aparecer **só para a nave da última mensagem
  dele** (função `dono_atual`).
- **Conserta o mapa login → instância** na tabela `atendentes`: remove vínculo
  errado e regrava o mapa oficial (Ana→wa2, Manu→manu, Robson→Robson,
  Lívia→Livia, Ruam→Ruan, Darah→Darah, Felipe→Felipe).

## Checklist de implantação (nesta ordem)

1. **Supabase:** rodar `supabase/passo7-sugestoes-por-instancia.sql` (RUN) e
   conferir as 3 tabelas de resultado:
   - (a) os **7 logins**, cada um com sua instância — se faltar alguém, criar o
     usuário em Authentication → Users e rodar o script de novo;
   - (b) os **nomes de instância** chegando nas mensagens — têm que ser
     exatamente `wa2`, `manu`, `Darah`, `Livia`, `Felipe`, `Ruan`, `Robson`
     (maiúsculas/minúsculas contam). Nome diferente = corrigir o nome da
     instância na Evolution ou ajustar o mapa do script;
   - (c) quantas sugestões cada navegador vai ver.
2. **n8n:** importar `WF-12-06.json`; nos nós **"Configurar Supabase"** e
   **"Configurar Supabase 18h"**, colar a chave **service_role** real (no JSON
   está o placeholder `COLE_AQUI_SUA_SECRET_KEY`); conferir credenciais de
   Postgres e Header Auth; **ativar o WF-12/06 e desativar o WF-11/06**
   (os dois ativos = mensagem duplicada no banco).
3. **Conferir no painel:** entrar com o login da Manu → só mentorados da
   `manu`; sair, entrar com a Ana → só os da `wa2`; idem Robson, Lívia, Ruam e
   Darah. Pedir Ctrl+Shift+R se alguém estiver com a página aberta de antes.

## Observações

- A Ana deixa de ver o aglomerado: mentorado cujo histórico antigo era `wa2`
  mas que hoje fala com outra nave passa a aparecer **só** na nave atual.
- Se um mentorado mandar mensagem para duas naves, vale a **última**: a
  sugestão nasce carimbada com a instância da mensagem recebida mais recente.
- Sugestões `pendentes` antigas sem dono identificável (número sem nenhuma
  mensagem carimbada) somem do painel de todos — a conferência (c) do passo 7
  mostra se sobrou alguma como "(sem carimbo — invisível)".
