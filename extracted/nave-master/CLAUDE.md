# Nave Master — Sistema de CS da Mentoria Fluxo

Assistente de CS multi-agente para a Mentoria Fluxo. Responde dúvidas de mentorados via WhatsApp com agentes especializados.

## Como testar

Escreva: `Simula mensagem: [mensagem do mentorado]`

O agente `nave-master` executa toda a cadeia automaticamente.

## Agentes disponíveis

| Agente | Função |
|---|---|
| `nave-master` | Orquestrador — acione este para rodar o sistema completo |
| `nave-roteador` | Classifica a mensagem em suporte, tráfego, copy ou feedback |
| `nave-suporte` | Responde dúvidas operacionais usando o playbook das 10 intenções |
| `nave-especialista-trafego` | Analisa dúvidas de anúncios e campanhas |
| `nave-especialista-copy` | Analisa dúvidas de copy e páginas de vendas |
| `nave-especialista-feedback` | Analisa pedidos de revisão de material |
| `nave-perfil` | Mapeia o estilo de comunicação do mentorado |
| `nave-redator` | Escreve a resposta final no tom e estilo do mentorado |

## Próximos passos

- [ ] Alimentar `nave-especialista-trafego` com os documentos de tráfego da Fernanda
- [ ] Alimentar `nave-especialista-copy` com os prompts de copy e quiz
- [ ] Testar com mensagens reais e calibrar os prompts
- [ ] Integrar com n8n + Evolution API + Slack
