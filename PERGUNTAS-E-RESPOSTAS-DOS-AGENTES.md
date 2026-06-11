# Perguntas que os agentes respondem (e a sugestão de resposta)

Mapa completo de tudo que o sistema da Nave Master consegue responder hoje, com o
gatilho típico do mentorado e o resumo da sugestão de resposta que o agente entrega.

**Como o sistema decide:** toda mensagem passa pelo **Roteador**, que classifica em
uma de 4 categorias (e, no Suporte, num sub-tipo). A categoria define qual especialista
responde. Depois o **Redator** reescreve no tom do mentorado.

| Categoria | Quando cai aqui | Quem responde |
|---|---|---|
| **SUPORTE** | Operacional/corriqueiro (plataforma, prazos, boas-vindas, financeiro, relacionamento) | `nave-suporte` + skill do sub-tipo |
| **TRÁFEGO** | Anúncios pagos, campanhas, métricas, Meta Ads | `nave-especialista-trafego` |
| **COPY** | Página de vendas, anúncio, quiz, headline, funil, email | `nave-especialista-copy` |
| **FEEDBACK** | Pedido de revisão de material já pronto | `nave-especialista-feedback` (intake) + time de copy |

**Sub-tipos de SUPORTE:** Padrões · Fluxer · Análise/Plano de Ação · Financeiro · Sensível (cancelamento/congelamento/reclamação) · Fluxo Criativo · Relacionamento.

---

## 1. SUPORTE — Padrões (como funciona a mentoria)

| Pergunta / gatilho típico | Sugestão de resposta (resumo) |
|---|---|
| "Acabei de entrar", "sou seu mentorado", primeiro contato | Dá boas-vindas, se coloca à disposição, pede para o aluno contar o cenário dele (pode por áudio) e envia o link de informações iniciais. *Ação: anexar o card de boas-vindas.* |
| "Como começo?", "o que faço primeiro?" | Os 3 primeiros passos: atualizar o app Fluxer, mandar um "oi" no WhatsApp e fazer o Ajuste de Velas com foco. |
| "O que é / como faço o Ajuste de Velas?" | Explica que é a 1ª entrega (sequência de aulas) e que a análise de diagnóstico só libera com o Ajuste 100% concluído. |
| "Como é a primeira reunião / reunião de diagnóstico?" | Explica que acontece após o Ajuste; se já tiver material, manda com 24h de antecedência; se não, cria do zero na reunião. |
| "Só tem vaga longe", "não tem data próxima" | Pede a disponibilidade do aluno para verificar com o analisador se dá para antecipar. |
| "O que você faz?", "qual seu papel?", "horário de atendimento" | Explica o papel do navegador (apoio a dúvidas via WhatsApp, resposta em até 24h úteis, 9h–17h) e o que NÃO faz (não escreve copy, não cria design, não sobe campanha). |
| "Como entro na comunidade do WhatsApp?" | Explica que é o canal principal, só a equipe posta, e pede para deixar notificações ligadas. *Ação: enviar o link se ainda não estiver no grupo.* |
| "Como entro no canal Pro+Master?" | Explica que é exclusivo para quem tem +100 mil de faturamento lifetime; se se enquadra, envia o link. |
| "Como funciona o evento/retiro?", "tem gravação?" | Eventos/retiros pelo Zoom, link no grupo no dia; 6 retiros + 3 eventos/ano; gravação no Fluxer (botão Academy). |
| "Não recebo a newsletter / Diário de um Fluxer" | É enviada toda terça no e-mail; pede o e-mail cadastrado para verificar a base. |
| "Como indico alguém?", "o que ganho com indicação (PIF)?" | Explica o Programa de Indicações Fluxo e os prêmios cumulativos (1/3/5/7 indicações). *Ação: enviar formulário de indicação.* |
| "Minha conta no Face/Insta foi bloqueada", "checkout fora do ar" | Explica que é ferramenta externa (suporte direto com Meta/Hotmart/etc.); o Fluxo ajuda na estratégia, não no suporte da ferramenta. |
| "Onde atualizo os dados do meu negócio?" | Indica o botão "Editar dados do negócio" na tela inicial do Fluxer e reforça manter atualizado. |

---

## 2. SUPORTE — Fluxer (a plataforma)

| Pergunta / gatilho típico | Sugestão de resposta (resumo) |
|---|---|
| "Não recebi o e-mail de acesso ao Fluxer" | Assunto "Seu acesso ao Fluxer chegou", checar spam/promoções; pede o e-mail da compra para verificar. |
| "Não consigo logar", "esqueci a senha", "dá erro" | Confirmar o endereço certo, tentar aba anônima, usar "Esqueci minha senha"; se persistir, escala verificação manual. |
| "Não acho a aula / o entregável" | As aulas ficam dentro do Plano de Ação → Entregáveis; clicar em cada tarefa. |
| "Como entrego a tarefa / marco como concluído?" | Após assistir, clicar em Entregar e confirmar; repetir em cada entregável até concluir todos. |
| "Como solicito / agendo a análise?" | Ao concluir 100% surge "Entregar plano de ação"; responder a avaliação, confirmar dados e escolher data. *Se o botão não aparece, conferir se tudo está realmente "entregue".* |
| "Cadê o link da análise?" | Fica no próprio Fluxer, na página do plano (card verde "Acessar chamada", ativo no dia). |
| "Cadê a gravação da análise?" | Fluxer → página do plano → "Vídeo da Análise", liberada após preencher a avaliação pós-análise. |
| "Quando sai meu plano de ação?" | Até 7 dias úteis após a análise, em Planos no menu lateral. |
| "Como mudo meu nível?" | Clicar no nível (canto sup. direito) → Alterar nível → formulário com comprovante de faturamento. |
| "Onde vejo os eventos / a agenda?" | Menu lateral → Agenda; clicar no evento para ver data/horário e confirmar presença. |
| "O que é / como uso o Fluxer IA?" | Assistente de IA (beta) no menu lateral, para dúvidas de marketing/copy/campanha; há também "Agentes IA". |
| "Como edito meu projeto / dados?" | Card "Meu projeto" na tela inicial → Editar. |
| "Como falo com meu navegador pelo Fluxer?" | Aparece no card "Meu navegador", mas o contato oficial é pelo WhatsApp. |
| "O Fluxer não abre / a página não carrega" | Pede um vídeo curto do erro para o time técnico; enquanto isso, Ctrl+Shift+R ou aba anônima. |

---

## 3. SUPORTE — Análise e Plano de Ação (prazos)

| Pergunta / gatilho típico | Sugestão de resposta (resumo) |
|---|---|
| "Quando sai o plano de ação?" | Até 7 dias úteis após a análise, em Planos; se passou, avisa para verificar. |
| "Quando sai / cadê a gravação?" | Até 7 dias úteis após a reunião, na seção "Vídeo da Análise", só após a avaliação pós-análise. |
| "Cadê o link / como acesso a análise?" | No Fluxer, na página do plano; card com botão "Acessar chamada" ativo no dia. Não vai por e-mail/WhatsApp. |
| "Entreguei mas não aparecem horários para agendar" | As agendas liberam depois que o navegador confere as entregas; se passou 24h úteis, avisa. *Ação: verificar conferência no sistema.* |
| "Quero remarcar minha análise" | Botão "Alterar data" no Fluxer; se não tiver, passa a disponibilidade; avisa antes da sessão para não deixar o analisador esperando. |
| "Minha análise foi cancelada / sumiu" | Se houver botão "Cancelar análise", clicar para reabrir reagendamento; pede a disponibilidade. *Ação: liberar novas agendas no sistema.* |
| "Entrei na chamada e o analisador não apareceu" | Reconhece que não deveria acontecer, assume que a equipe resolve tudo, reagenda com prioridade. *Ação: escalar com prioridade máxima.* |
| "Concluí tudo, e agora?" | Surge "Entregar plano de ação"; responder avaliação e confirmar dados; depois o navegador libera horários. |
| "Quanto tempo para liberar os horários?" | Em geral até 24h úteis após entregar; pede há quantos dias entregou para verificar. |

---

## 4. SUPORTE — Financeiro

> Regra geral: quase tudo vai para a **Lya** (financeiro, WhatsApp **+55 61 9988-3078**). Exceção: mudança de data de pagamento, que é direto na **Hotmart**.

| Pergunta / gatilho típico | Sugestão de resposta (resumo) |
|---|---|
| "Meu boleto venceu / como gero outro?" | Falar com a Lya (financeiro) que ela gera rápido. |
| "Dúvida de parcelamento / quero mudar parcelas" | Falar com a Lya. |
| "Preciso da nota fiscal" | Falar com a Lya informando nome completo e CPF. |
| "Cobrança indevida / cobrado em duplicidade / estorno" | Acolhe e tranquiliza; falar com a Lya descrevendo o que aconteceu. |
| "Quero mudar a data do pagamento" | Essa alteração é feita direto no suporte da **Hotmart** (não passa pelo financeiro do Fluxo). |
| "Por que me cobraram esse valor?" | Falar com a Lya para esclarecer valores/cobranças. |

---

## 5. SUPORTE — Sensível: Cancelamento

> Objetivo: entender o motivo real antes de qualquer direcionamento e tentar reverter com delicadeza. Nunca pedir desculpas nem assumir culpa do Fluxo.

| Situação / gatilho | Sugestão de resposta (resumo) |
|---|---|
| Pede cancelamento sem dizer o motivo | Acolhe e pergunta com delicadeza o que está acontecendo, sem pressão. |
| Motivo é financeiro ("não consigo pagar") | Acolhe sem julgar e oferece conversar com o financeiro (pode haver negociação) — passa o contato da Lya. *Ação: avisar a Lya antes.* |
| Motivo é saúde/falecimento/divórcio | Não trata como cancelamento → redireciona para **Congelamento**. |
| Está insatisfeito com algo entregue | Não trata como cancelamento → redireciona para **Reclamação**. |
| "Não consigo implementar / esperava mais rápido / não tive retorno" | Reconhece o momento sem validar que a mentoria falhou; pivota para entender o que travou e oferece ação concreta (análise aprofundada, revisão de tráfego) antes de qualquer decisão. *Ação: checar histórico e, se preciso, acionar call de reversão.* |

---

## 6. SUPORTE — Sensível: Congelamento (pausa)

> Elegível só em 3 casos: **saúde do próprio mentorado** (até 6 meses), **falecimento de ente querido** (até 6 meses), **divórcio** (até 3 meses). Os demais motivos não são elegíveis — e aí redireciona **sem nunca mencionar congelamento**.

| Situação / gatilho | Sugestão de resposta (resumo) |
|---|---|
| Motivo válido (saúde/falecimento/divórcio) | Acolhe com empatia, confirma elegibilidade, explica o processo (formulário no Fluxer → documento para assinar → parcelas pausadas) e o prazo. *Ação: liberar o formulário no Fluxer.* |
| Motivo não elegível + parece querer sair | Trata como **Cancelamento** (sem citar congelamento). |
| Motivo não elegível + parece insatisfeito | Trata como **Reclamação** (sem citar congelamento). |

---

## 7. SUPORTE — Sensível: Reclamação

> Nunca assume culpa, nunca é defensivo, sempre foca no caminho à frente.

| Tipo de reclamação | Sugestão de resposta (resumo) |
|---|---|
| Insatisfação com resultados | Valida o sentimento, contextualiza que desafios são parte da jornada, pergunta exatamente o que está travando e oferece call de alinhamento. *Ação: acionar o navegador.* |
| Reclamação de entrega específica (análise/plano) | Valida, pergunta o que faltou e mostra abertura para revisão — sem prometer "refazer tudo" sem validar. *Ação: escalar para liderança.* |
| Reclamação sobre o navegador | Valida sem assumir culpa, mostra que o feedback é levado a sério e que vai verificar — sem expor o navegador. *Ação: escalar para liderança.* |
| Insatisfação difusa (não explica o quê) | Reconhece o momento, faz pergunta aberta e gentil, não apressa; se sinalizar querer sair, vira Cancelamento. |

---

## 8. SUPORTE — Relacionamento (vínculo e motivação)

| Situação / gatilho | Sugestão de resposta (resumo) |
|---|---|
| "Sumi mas voltei", "estava perdido" | Acolhe o retorno, pergunta onde parou e convida a agendar nova análise. |
| "Preciso de mais tempo / estender o acesso" | Se já explicou: diz que não é padrão mas leva ao time; se não: pede o contexto primeiro. *Ação: levar o caso ao time.* |
| "Fiz minha primeira venda / bati a meta" | Comemora de verdade, reforça o caminho certo e aponta a próxima meta (otimizar para escalar). |
| "Estou desanimado / pensando em desistir" (sem culpar o Fluxo) | Valida o sentimento e reforça a constância (uma coisa por dia); se culpa o Fluxo → Reclamação; se fala em sair → Cancelamento. |
| "Quero mudar de nicho / produto" | Diz que mudar no meio não é incentivado (precisa de tempo para gerar resultado), mas leva ao time. *Ação: levar ao time.* |
| "Que ferramenta uso para página/quiz/e-book?" | Indicação não é o padrão, mas dá referências: página→Lovable, quiz→Enlead, vídeo→CapCut, e-book/mockup→Canva. |
| "Quais são meus bônus / como acesso?" | Se for call de bônus do plano 1/2: pergunta se prefere copy ou tráfego; se for outro: verifica com o time e retorna no mesmo dia. *Ação: verificar com o time.* |

---

## 9. SUPORTE — Fluxo Criativo (uso do Claude Code no evento de IA)

> Dúvidas sobre o evento Fluxo Criativo. Plataforma de entregas: `iaseverino.lovable.app`.

| Pergunta / gatilho típico | Sugestão de resposta (resumo) |
|---|---|
| "Como começo / inicio meu projeto?" | Abrir o Claude Code, selecionar a pasta do Fluxo-criativo e digitar `/produto-novo`. |
| "Como criar anúncios?" | Baixar o "Prompt Mestre · Anúncios Estáticos" (Dia 1), rodar no Claude, preencher dados e gerar imagens no ChatGPT. |
| "Como criar carrossel?" | Baixar o prompt "Carrossel Ninguém te conta" (Dia 1) e rodar no Claude. |
| "Como escrever a copy da página de vendas?" | Nova sessão → `/` → "página de vendas" → "Só a copy"; visualizar em Arquivos → Meus-Produtos. |
| "Como criar página de captura / obrigado?" | Nova sessão → `/` → skill "página de captura"/"obrigado" → "Só a copy". |
| "Como criar a página bloco a bloco?" | Enviar `/ui-reverse-engineer`, mandar print de referência (Pinterest/SeverinoIA) e construir bloco a bloco. |
| "Como unir os blocos numa página?" | Pedir para listar as seções em HTML e depois juntar tudo numa página única com a URL local. |
| "Como publicar no Vercel / mudar domínio / pixel?" | Usar a API da Vercel (token Full Account), publicar e receber o link; pixel via `/pagina-pixel`. |
| "Como criar imagens com IA?" | Criar uma Key no OpenRouter e colar no Claude Code. |
| "Como criar o playbook comercial?" | Nova sessão → `/playbook-comercial`, selecionar o projeto. |
| "Como criar um micro SaaS?" | `/app-saas` no Claude + Lovable, escolher uma ideia e dar feedbacks graduais. |
| "Como criar o dashboard de métricas?" | `/dashboard-social`, informar as redes; criar token Apify quando pedido. |
| "Como criar campanha no Meta?" | `/trafego-criar-campanha`, informar objetivo/produto/ticket e seguir o passo a passo. |
| "Como conectar a Meta / Facebook Ads?" | `/trafego-conexao` ou `/meta-conexao` (via APP ou MCP). |
| "Como analisar meu tráfego?" | `/trafego-analise`, selecionar campanhas e tipo de diagnóstico (gera dashboard HTML). |
| "Como otimizar campanhas?" | `/trafego-otimizar`; gera diagnóstico + plano de ação. |
| "A senha do agente está incorreta" | É uma de quatro: `fluxo`, `FLUXO`, `mentoriafluxo` ou `atodecoragem`. |

---

## 10. TRÁFEGO (anúncios pagos, campanhas, métricas)

O especialista lê o **momento** do mentorado:

| Momento / gatilho | Sugestão de resposta (resumo) |
|---|---|
| **Vai fazer** — "vou subir minha campanha hoje" | Parabeniza e incentiva, diz que quando estiver no ar é só mandar e aponta os materiais do plano de ação. Não dá tutorial. |
| **Já fez / tem resultado** — "não está performando", "CPM alto", manda métricas/prints | Pede a **campanha exportada do gerenciador de anúncios** (e pergunta se sabe baixar). Não chuta diagnóstico com métrica solta. |
| **Dúvida conceitual** — "o que é CBO?", "para que serve o pixel?" | Resposta direta e útil + um próximo passo concreto. |

---

## 11. COPY (página de vendas, anúncio, quiz, headline, funil, email)

| Momento / gatilho | Sugestão de resposta (resumo) |
|---|---|
| **Vai fazer** — "vou criar minha página/quiz" | Parabeniza e incentiva a execução; diz que quando estiver pronto é só mandar; aponta os materiais de referência. Não dá tutorial. |
| **Já fez / tem material** — "terminei", "dá uma olhada?", manda link/texto | Se ainda não mandou, pede para mandar do jeito que estiver; encaminha ao **time de copy** (devolutiva em até **4 dias úteis**). Não dá a crítica de copy na hora. |
| **Dúvida conceitual** — "o que é headline?", "diferença entre captura e vendas?" | Resposta direta dentro da lógica do Fluxo + próximo passo. |

---

## 12. FEEDBACK (revisão de material pronto)

O agente de feedback faz o **intake**: acolhe, confirma o encaminhamento e deixa claro o prazo (**até 4 dias úteis**). Quem faz a crítica técnica (VTSD) é o **time de copy**.

| Caso / gatilho | Sugestão de resposta (resumo) |
|---|---|
| Material que o time revisa (página de vendas, anúncio, quiz), ainda não enviado | Pede para mandar do jeito que estiver; ao receber, encaminha ao time (até 4 dias úteis). |
| Material coberto, já enviado | Parabeniza e avisa que está enviando ao time agora (até 4 dias úteis). |
| Material que o time NÃO revisa (e-book, curso, módulos, email de venda, script de webinar) | Explica com gentileza que isso está ligado à expertise dele; o time foca em página de vendas, anúncio e quiz. |

### O que o time de copy avalia em cada material (critérios VTSD)

- **Página de vendas (com VSL):** mapeia 15 seções (1ª dobra, CTA, prova, bônus, autoridade, método, depoimentos, FAQ, fechamento…), aplica as 7 Leis da Light Copy e marca vícios proibidos (travessão, exclamação, produto no lead etc.). Entrega: trecho original → problema → copy sugerida → por que mudar + os 3 ajustes de maior impacto.
- **Página low ticket (R$17–197, sem VSL):** identifica a categoria de copy (Inadequação, Identificação, Plug & Play, Promessa Boa Demais), checa as 11 seções e erros típicos (preço sem ancoragem, copy longa demais, produto no hero).
- **Anúncios (estático e vídeo):** avalia Gancho (para o scroll, sem pergunta/óbvio) → Desenvolvimento (entrega valor real) → CTA; para vídeo, a régua de tempos (gancho 0-3s, tease, entrega, reganho, CTA).
- **Quiz (estrutura SPIN, 10–15 perguntas):** headline com número/prazo, P6 com Calculadora, P8 com Visualização Profunda, tela de resultado que nomeia o problema sem citar o produto.

---

> **Quando nada se encaixa:** todas as skills têm um fallback `NAO_MAPEADA` que monta a melhor resposta possível com o contexto e **sinaliza para revisão humana** — nunca inventa uma resposta arriscada.
