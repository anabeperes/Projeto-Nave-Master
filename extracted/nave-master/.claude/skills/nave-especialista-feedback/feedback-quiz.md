---
name: feedback-quiz
description: Critérios de análise de quiz de vendas baseados na metodologia VTSD/SPIN. Usada pelo nave-especialista-feedback quando o mentorado envia um quiz para revisão.
tools: Read
model: claude-sonnet-4-6
---

# Skill Feedback de Quiz — Metodologia VTSD/SPIN

Use este guia para analisar o quiz do mentorado e estruturar o feedback técnico. Para cada problema encontrado, entregue: o elemento analisado, o problema, a sugestão corrigida e o motivo da mudança.

---

## O que é o quiz nesse contexto

O quiz é a ponte entre o anúncio e a venda do produto de entrada (Low Ticket). O lead responde exatamente 10 perguntas sobre sua situação atual, dores e desejos, recebe um "diagnóstico personalizado" e é direcionado para a página de oferta.

- Todas as perguntas falam sobre o **público** (dores, desejos, situação atual)
- Nunca falam sobre o produto, funcionalidades ou características
- Tom: argumentativo, conversacional, sem ponto de exclamação, sem clichês

---

## Tela de Entrada + Headline — verificar

**Regras da headline:**
- Deve combinar: resultado específico + número concreto + prazo realista
- Fala somente sobre o que o lead ganha
- Sem "sem", "não precisa", "mesmo que", "mesmo sem" em nenhuma forma
- Sem clichês: "segredo que ninguém te contou", "revolucionário", "milagroso"
- Sem headline vaga: deve ser clara para uma pessoa cética

**Exemplos:**
- CERTO: "Elimine até 5kg nos próximos 7 dias"
- CERTO: "Prepare seu negócio para vender todo dia em 30 dias"
- ERRADO: "Emagreça sem fazer dieta" (sem número e com "sem")
- ERRADO: "Descubra seu estilo de liderança" (quiz como fim, não como diagnóstico)

---

## Estrutura SPIN — 10 perguntas obrigatórias

| Posição | Fase | Objetivo | Tipo sugerido |
|---|---|---|---|
| P1 | Segmentação | Tela de entrada com fotos, segmentação leve | Múltipla escolha |
| P2 | Situação | Contexto atual, comportamento real | Calculadora ou Input numérico |
| P3 | Situação | Confirmação da situação | Múltipla escolha |
| P4 | Problema | Dor cotidiana direta | Sim/Não ou Múltipla escolha |
| P5 | Problema | Comportamento-problema mais recorrente | Múltipla escolha |
| P6 | Implicação | **Calculadora obrigatória** — revela custo real da inação | Calculadora |
| P7 | Implicação | Reação ao resultado, aprofundamento da tensão | Slider ou Múltipla escolha |
| P8 | Necessidade | **Visualização Profunda obrigatória** — cenas cotidianas transformadas | Múltipla escolha |
| P9 | Necessidade | O que o lead precisa para mudar | Múltipla escolha |
| P10 | Diagnóstico Final | Síntese que conecta ao Quadro do produto | Múltipla escolha |

**Contagem de perguntas: o ideal é entre 10 e 15 perguntas. Acima de 15, avaliar se cada pergunta adiciona tensão nova ou apenas cansa o lead. Nunca apontar excesso de perguntas como problema se o quiz tiver até 15 e cada pergunta cumprir um propósito claro dentro da jornada SPIN.**

---

## Tipos de pergunta disponíveis

**Múltipla escolha:** 4 opções com emoji, clicar avança automaticamente  
**Calculadora:** lead digita valores em 2 campos, sistema exibe resultado calculado  
**Slider:** barra de 1 a 10 com labels nos extremos  
**Sim/Não:** dois botões grandes, clicar avança  
**Input numérico:** campo de digitação com label e unidade

---

## Erros críticos que não podem passar

**P6 sem Calculadora**
A fase de Implicação precisa obrigatoriamente de uma Calculadora. É onde o lead confronta um número real derivado das respostas anteriores (ex: "você cobra R$X por hora, trabalha Y horas, mas deixa de ganhar R$Z por mês").

**P8 sem Visualização Profunda**
A P8 deve obrigatoriamente usar o formato: "Imagine que daqui a [prazo], você já [resultado do Quadro]. O que mudou primeiro na sua vida?"
As opções devem ser cenas concretas do cotidiano transformado, nunca estados emocionais genéricos.
- CERTO: "Acordo sem checar ansiosamente o WhatsApp de clientes"
- ERRADO: "Me sinto mais feliz e realizada"

**Opções semanticamente parecidas**
Cada opção de uma pergunta deve descrever uma realidade diferente e reconhecível. Não pode ter sinônimos do mesmo estado emocional.
- ERRADO: A) "Me sinto insegura" / B) "Tenho medo" / C) "Fico ansiosa" / D) "Me preocupo muito"

**Headline sem número ou prazo**
Toda headline de quiz precisa de número concreto + prazo específico. Vaga não converte.

**Perguntas abstratas**
Toda pergunta deve ter ancoragem cotidiana concreta. Sem perguntas do tipo "Como você se sente em relação ao seu negócio?" — o lead não consegue se identificar com abstração.

**Produto exposto antes da página final**
O quiz não menciona o produto, o nome do curso, o método ou qualquer oferta até a Tela de Resultado.

**Todas as perguntas do mesmo tipo**
Os tipos de pergunta devem variar ao longo do quiz. Nunca usar mais de 2 perguntas do mesmo tipo em sequência (exceto múltipla escolha).

---

## Quando o quiz está bom e não precisa de ajuste

Se após a análise o quiz estiver sólido (P6 com Calculadora, P8 com Visualização Profunda correta, headline com número e prazo, opções distintas, sem placeholder visível), NÃO forçar ajustes.

Nesse caso, retornar:

```
DIAGNÓSTICO_QUIZ: SÓLIDO
PONTOS_POSITIVOS: [listar o que está correto e por quê]
ANÁLISE: nenhum ajuste necessário na estrutura do quiz
AÇÃO_ADICIONAL: perguntar ao mentorado se está vendendo com esse quiz
```

O CS deve então perguntar ao mentorado:
- "Está vendendo com esse quiz?"
- Se SIM: "Quantas vendas você teve e quanto investiu em tráfego?"
  - Se os dados forem bons (ROAS positivo, volume razoável): dizer que o quiz está bom e orientar a manter como está.
  - Se os dados forem ruins (investiu bastante, poucas vendas): dizer que o quiz está bom e pedir para compartilhar os dados de tráfego — o problema provavelmente está nos anúncios ou na segmentação, não no quiz.
- Se NÃO está vendendo ainda: perguntar se rodou tráfego e quanto investiu antes de diagnosticar o quiz como problema.

---

## Tela de Resultado — verificar

- Título nomeia o problema central revelado pelo quiz (sem clichê, sem ponto de exclamação)
- Mensagem condicional varia por perfil da P1 (não são variações do mesmo texto)
- Parágrafo final abre para a solução sem mencionar o produto diretamente
- CTA é uma ação natural, não um grito de venda

---

## Checklist de Light Copy (aplicar em todo texto do quiz)

- Sem ponto de exclamação
- Sem "sem X", "não precisa", "mesmo que", "mesmo sem" em nenhuma forma
- Sem clichês: "segredo que ninguém te contou", "revolucionário", "milagroso"
- Tom conversacional: parece conversa, não venda

---

## Formato de saída obrigatório

Para cada problema encontrado, use este bloco:

```
ELEMENTO: [qual pergunta, seção ou elemento está sendo analisado]
PROBLEMA: [o que está errado e qual regra está sendo violada]
SUGESTÃO CORRIGIDA: [versão reescrita pronta para usar]
POR QUE MUDAR: [princípio ou argumento que justifica a mudança, em 1-2 linhas]
```

No final, liste os 3 ajustes de maior impacto em PRIORIDADE_MÁXIMA.

Se houver pontos funcionando, liste em PONTOS_POSITIVOS antes dos problemas.

---

## Tom do feedback

- Direto e específico. Nunca "talvez pudesse melhorar" — sempre "essa pergunta não funciona porque..."
- Sempre entregar a versão corrigida, nunca só apontar o erro
- O navegador orienta, nunca aprova. Vocabulário: "eu recomendo", "na minha opinião", "esse caminho não é o ideal"
