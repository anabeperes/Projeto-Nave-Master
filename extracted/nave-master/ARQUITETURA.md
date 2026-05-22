# Arquitetura — Nave Master

Sistema multi-agente de CS da Mentoria Fluxo. Recebe mensagens de mentorados via WhatsApp e entrega uma resposta pronta para o CS copiar e colar, no tom e estilo do mentorado.

---

## Fluxo completo

```
Mensagem do mentorado
        |
        v
  [nave-master]  ← orquestrador, coordena toda a cadeia
        |
        v
  [nave-roteador]  ← classifica a mensagem em 4 categorias
        |
   _____|_____________________________________
   |                                         |
   v                                         v
[Especialista]  ← escolhido pelo roteador   [nave-perfil]  ← roda em paralelo
   |                                         |
   |_________________________________________|
                        |
                        v
                  [nave-redator]  ← combina conteúdo técnico + perfil
                        |
                        v
              Resposta final para o CS
```

O especialista e o perfil rodam em paralelo (Passo 2 e 3 simultâneos) para reduzir o tempo de resposta.

---

## Agentes

### nave-master
**Arquivo:** `.claude/agents/nave-master.md`
**Função:** Orquestrador. Recebe a mensagem do mentorado, coordena a cadeia na ordem correta e entrega a resposta final formatada para o CS.
**Como usar:** `Simula mensagem: [mensagem do mentorado]`

---

### nave-roteador
**Arquivo:** `.claude/agents/nave-roteador.md`
**Função:** Classifica a mensagem em uma das 4 categorias.

| Categoria | Quando acionar |
|---|---|
| SUPORTE | Dúvidas operacionais: acesso ao Fluxer, prazos, primeiros passos, comunidade |
| TRÁFEGO | Anúncios, métricas, campanhas, criativos, pixel, escala |
| COPY | Página de vendas, anúncio, quiz, email, headline, funil |
| FEEDBACK | Pedido de revisão de material já produzido |

**Output:** `CATEGORIA / CONFIANÇA / MOTIVO / DÚVIDA_RESUMIDA`

---

### nave-suporte
**Arquivo:** `.claude/agents/nave-suporte.md`
**Função:** Responde dúvidas operacionais usando o playbook de 8 intenções mapeadas. Chama skills externas conforme o tipo de dúvida.
**Output:** `INTENÇÃO / CONFIANÇA / RESPOSTA_BASE / AÇÃO_ADICIONAL`

**Skills disponíveis:**

| Skill | Arquivo | Cobre |
|---|---|---|
| padroes | `.claude/skills/nave-suporte/padroes.md` | Como funciona a mentoria: Ajuste de Velas, navegador, comunidade, eventos, newsletter, PIF, ferramentas externas |
| fluxer | `.claude/skills/nave-suporte/fluxer.md` | Acesso à plataforma Fluxer Academy: login, navegação, aulas | ⚠️ pendente |
| analise-plano-acao | `.claude/skills/nave-suporte/analise-plano-acao.md` | Prazos, gravações, link da análise | ⚠️ pendente |
| cancelamento | `.claude/skills/nave-suporte/cancelamento.md` | Pedidos de cancelamento | ⚠️ pendente — depende de templates da Ana |
| congelamento | `.claude/skills/nave-suporte/congelamento.md` | Pedidos de congelamento | ⚠️ pendente — depende de templates da Ana |
| reclamacao | `.claude/skills/nave-suporte/reclamacao.md` | Reclamações e insatisfações | ⚠️ pendente — depende de templates da Ana |

---

### nave-especialista-trafego
**Arquivo:** `.claude/agents/nave-especialista-trafego.md`
**Função:** Diagnostica dúvidas de tráfego pago (Meta Ads, métricas, públicos, criativos, pixel, escala).
**Output:** `DIAGNÓSTICO / NÍVEL / TIPO_DE_PROBLEMA / CONTEÚDO_DA_RESPOSTA / PRÓXIMO_PASSO`
**Status:** Estrutura pronta. Alimentar com a metodologia de tráfego da Fernanda.

---

### nave-especialista-copy
**Arquivo:** `.claude/agents/nave-especialista-copy.md`
**Função:** Analisa dúvidas de copy (página de vendas, anúncio, quiz, email, headline).
**Output:** `DIAGNÓSTICO / ETAPA / TIPO_DE_COPY / CONTEÚDO_DA_RESPOSTA / PRÓXIMO_PASSO`
**Status:** Estrutura pronta. Alimentar com os prompts de copy e quiz da Fernanda.

---

### nave-especialista-feedback
**Arquivo:** `.claude/agents/nave-especialista-feedback.md`
**Função:** Trata pedidos de revisão de material. Confirma recebimento e orienta sobre o prazo (4 dias úteis via time de copy).
**Output:** `TIPO_DE_MATERIAL / DIAGNÓSTICO / CONTEÚDO_DA_RESPOSTA / PRÓXIMO_PASSO`

---

### nave-perfil
**Arquivo:** `.claude/agents/nave-perfil.md`
**Função:** Lê a mensagem do mentorado e mapeia o estilo de comunicação para que o redator escreva no mesmo tom.
**Analisa:** tom (formal/informal/muito informal), energia (alta/média/baixa), uso de emojis, tamanho das mensagens, estilo de escrita.
**Output:** `TOM / ENERGIA / EMOJIS / TAMANHO / ESTILO / INSTRUÇÃO_PARA_REDATOR`

---

### nave-redator
**Arquivo:** `.claude/agents/nave-redator.md`
**Função:** Último agente da cadeia. Combina o conteúdo técnico do especialista com o perfil do mentorado e escreve a mensagem final pronta para o CS copiar e colar no WhatsApp.
**Output:** `RESPOSTA_FINAL / NOTA_PARA_O_CS`

---

## Estrutura de pastas

```
nave-master/
├── CLAUDE.md                          # Instruções gerais do projeto
├── ARQUITETURA.md                     # Este arquivo
└── .claude/
    ├── agents/
    │   ├── nave-master.md             # Orquestrador
    │   ├── nave-roteador.md           # Classificador
    │   ├── nave-suporte.md            # Suporte operacional
    │   ├── nave-especialista-trafego.md
    │   ├── nave-especialista-copy.md
    │   ├── nave-especialista-feedback.md
    │   ├── nave-perfil.md             # Leitor de estilo do mentorado
    │   └── nave-redator.md            # Redator final
    └── skills/
        └── nave-suporte/
            ├── padroes.md             # ✅ pronto
            ├── fluxer.md              # ⚠️ pendente
            ├── analise-plano-acao.md  # ⚠️ pendente
            ├── cancelamento.md        # ⚠️ pendente
            ├── congelamento.md        # ⚠️ pendente
            └── reclamacao.md          # ⚠️ pendente
```

---

## O que está pronto

| Componente | Status |
|---|---|
| nave-master (orquestrador) | ✅ pronto |
| nave-roteador | ✅ pronto |
| nave-suporte (estrutura) | ✅ pronto |
| nave-perfil | ✅ pronto |
| nave-redator | ✅ pronto |
| nave-especialista-trafego (estrutura) | ✅ pronto |
| nave-especialista-copy (estrutura) | ✅ pronto |
| nave-especialista-feedback | ✅ pronto |
| skill padroes.md | ✅ pronto |
| skill fluxer.md | ⚠️ pendente |
| skill analise-plano-acao.md | ⚠️ pendente |
| skill cancelamento.md | ⚠️ pendente — depende de templates da Ana |
| skill congelamento.md | ⚠️ pendente — depende de templates da Ana |
| skill reclamacao.md | ⚠️ pendente — depende de templates da Ana |
| Integração n8n + Evolution API + Slack | ⚠️ Fase 2 |

---

## Como testar

Abra o projeto `nave-master` no Claude Code e escreva:

```
Simula mensagem: [mensagem do mentorado]
```

Exemplos:
```
Simula mensagem: oi, como acesso a primeira reunião?
Simula mensagem: meu anúncio tá com CPC alto, o que pode ser?
Simula mensagem: pode revisar minha página de vendas?
```

O orquestrador executa a cadeia completa e entrega a resposta pronta.

---

## Próximos passos

1. Criar `skill fluxer.md` — acesso à plataforma Fluxer Academy
2. Criar `skill analise-plano-acao.md` — prazos, gravações, link da análise
3. Criar `skill cancelamento.md`, `congelamento.md`, `reclamacao.md` — aguardando templates da Ana
4. Alimentar `nave-especialista-trafego` com metodologia de tráfego da Fernanda
5. Alimentar `nave-especialista-copy` com prompts de copy e quiz da Fernanda
6. Testar com mensagens reais de mentorados e calibrar prompts
7. Integração n8n + Evolution API + Slack (Fase 2)
