# Nave Master — Sistema de CS da Mentoria Fluxo

Assistente de CS multi-agente para a Mentoria Fluxo. Responde dúvidas de mentorados via WhatsApp com agentes especializados.

## Como rodar o painel

O painel da Navegadora (`painel/index.html`) é a interface onde o CS vê as sugestões, edita, copia e marca como respondida.

```
npm start        # abre em http://localhost:3000
npm test         # smoke test do servidor + teste de DOM (jsdom) do painel
npm run test:e2e # teste em navegador real (Playwright/Chromium) — opcional
```

`npm start` sobe um servidor estático sem dependências (`server.mjs`). Use http (não abra o arquivo direto via `file://`), porque o painel depende de `fetch` e da área de transferência.

O `npm test` (smoke + DOM via jsdom) roda em qualquer lugar, sem navegador. O `npm run test:e2e` usa um navegador real e, na primeira vez, precisa de `npx playwright install chromium`; sem o Chromium instalado, ele pula os testes em vez de falhar.

- **Fonte de dados:** se `SUPABASE_URL`/`SUPABASE_ANON_KEY` (no topo do `<script>`) estiverem preenchidos e acessíveis, busca do Supabase. Se o Supabase falhar, estiver fora do ar ou vazio, cai automaticamente no modo demonstração (dados de exemplo).
- **Persistência local:** edições, aprendizados e o status de cada mensagem (respondida/reaberta) ficam no `localStorage` do navegador e sobrevivem ao recarregar a página. Com Supabase configurado, o status também é gravado lá.

## Como testar (agentes)

Sem histórico: `Simula mensagem: [mensagem do mentorado]`

Com histórico da conversa (recomendado para respostas coerentes):
```
Simula conversa:
[navegador]: pergunta ou última mensagem enviada pelo CS
[mentorado]: mensagem atual a ser respondida
```

Quando receber esse comando, o Claude Code executa a cadeia completa diretamente, seguindo as instruções do `nave-master.md`:

1. Aciona `nave-contexto` com o histórico (se houver) e a mensagem atual → gera o brief de contexto
2. Aciona `nave-roteador` com a mensagem + brief de contexto
3. Em paralelo: aciona o especialista correto (baseado na categoria) e `nave-perfil`, ambos com o contexto
4. Aciona `nave-redator` com os outputs do especialista, do perfil e o brief de contexto
5. Entrega o resultado no formato padrão

**Importante:** sub-agentes não conseguem acionar outros sub-agentes em cascata neste ambiente. Por isso, o Claude Code atua como executor da cadeia, seguindo fielmente as instruções do `nave-master.md`. A arquitetura multi-agente é preservada — apenas o disparador muda.

## Agentes disponíveis

| Agente | Função |
|---|---|
| `nave-master` | Orquestrador — acione este para rodar o sistema completo |
| `nave-contexto` | Analisa o histórico da conversa e gera o brief de contexto (passo 0) |
| `nave-roteador` | Classifica a mensagem em suporte, tráfego, copy ou feedback |
| `nave-suporte` | Responde suporte por sub-tipo (padrões, fluxer, análise, financeiro, sensível, fluxo criativo, relacionamento), usando só a skill certa |
| `nave-especialista-trafego` | Lê o momento (vai fazer / já fez / dúvida) em tráfego; quando há campanha, pede a exportação do gerenciador |
| `nave-especialista-copy` | Lê o momento (vai fazer / já fez / dúvida) em copy; material pronto vai para o time de copy |
| `nave-especialista-feedback` | Intake do pedido de feedback: encaminha para o time de copy (devolutiva em até 4 dias úteis). A análise VTSD detalhada fica nas skills de feedback |
| `nave-perfil` | Mapeia o estilo de comunicação do mentorado |
| `nave-redator` | Escreve a resposta final no tom e estilo do mentorado (suporte, tráfego, copy, intake de feedback) |
| `nave-redator-feedback` | Redator didático para a crítica VTSD detalhada (time de copy / análise profunda), fora do intake de feedback ao vivo |

## Próximos passos

- [ ] Alimentar `nave-especialista-trafego` com os documentos de tráfego da Fernanda
- [ ] Alimentar `nave-especialista-copy` com os prompts de copy e quiz
- [ ] Testar com mensagens reais e calibrar os prompts
- [ ] Integrar com n8n + Evolution API + Dashboard na Vercel (o relatório diário e as sugestões são gravados no Supabase e exibidos no painel; não há mais envio para o Slack)
