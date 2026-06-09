# Guia — vários atendentes, cada um vê só o seu WhatsApp

Você já tem tudo funcionando para **1 WhatsApp (o seu)**. Este guia adiciona os
outros atendentes, cada um com **login e senha próprios**, vendo no painel **só
as mensagens do WhatsApp dele**.

## Como funciona (a ideia em 1 minuto)

- **Não são vários painéis.** É **um painel só**, o mesmo link para todos. Cada
  pessoa faz login e vê só o que é dela — igual ao Gmail.
- A separação acontece porque **toda mensagem é carimbada** com o nome da
  *instância* (o WhatsApp que a recebeu) lá no n8n.
- O banco (Supabase) tem uma **trava (RLS)**: quando a Ana faz login, ele só
  devolve as mensagens carimbadas com a instância da Ana.

```
WhatsApp da pessoa → Evolution API → n8n (carimba) → Supabase (trava) → Painel (login)
```

> **Ordem importa.** Faça os passos **na ordem abaixo**. O passo 4 (rodar o SQL)
> liga a trava — se você ligar antes de carimbar as mensagens (passo 1), o painel
> fica vazio até o carimbo chegar. Seguindo a ordem, nada para de funcionar.

---

## Passo 1 — n8n: carimbar a mensagem com a instância

No seu workflow do n8n, **dois ajustes pequenos**:

### 1a. Nó "Normalizar Payload"
Esse nó já monta o objeto da mensagem. Adicione a **instância** a ele.

- Pegue o nome da instância do payload da Evolution (vem no campo `instance`).
- No `return`, inclua o campo `instancia`.

Troque o trecho final do código do nó (o `return {...}`) por este:

```js
const pushName = data.pushName || null;
const instancia = body.instance || body.instanceName || null; // nome da instância na Evolution

return [{
  json: {
    skip: false,
    direction: fromMe ? 'outgoing' : 'incoming',
    whatsapp_number: number,
    contact_name: pushName,
    content,
    evolution_msg_id: msgId,
    instancia,            // <— carimbo
    raw_event: event
  }
}];
```

### 1b. Nó "Inserir Mensagem Incoming"
Grave o carimbo na tabela. Troque a **Query** por (note a coluna `instancia` e o `$6`):

```sql
INSERT INTO messages (contact_id, whatsapp_number, contact_name, direction, content, evolution_msg_id, status, instancia)
VALUES ($1, $2, $3, 'incoming', $4, $5, 'unread', $6)
ON CONFLICT (evolution_msg_id) DO NOTHING
RETURNING id;
```

E no campo **Query Replacement**, acrescente no final mais um valor:

```
={{ $('Normalizar Payload').item.json.instancia }}
```

(fica: `contact_id, whatsapp_number, contact_name, content, evolution_msg_id, instancia`)

---

## Passo 2 — Evolution API: conectar os 6 WhatsApps

Cada número de WhatsApp é uma **instância**. Crie uma por pessoa.

1. No painel da Evolution, **crie uma instância para cada atendente**. Dê um
   nome simples e sem espaços/acentos: `ana`, `joao`, `maria`, etc.
   **Guarde esses nomes** — eles são o "carimbo" que liga tudo.
2. Em cada instância, **escaneie o QR Code** com o WhatsApp daquela pessoa.
3. Configure o **webhook de cada instância apontando para o MESMO endereço** do
   n8n que já funciona (o webhook `evolution-webhook`), com o evento
   **`messages.upsert`** ligado.

> Não precisa de 6 workflows nem 6 bancos. É tudo no mesmo — o que separa é o
> nome da instância.

Confirme que o seu WhatsApp atual também tem um nome de instância definido
(ex.: `ana`). Vamos usá-lo no passo 4.

---

## Passo 3 — Supabase: criar os logins

1. No Supabase, vá em **Authentication → Users → Add user**.
2. Crie **um usuário por atendente** (e-mail + senha). Pode marcar
   "Auto Confirm User" para já sair ativo.
3. Anote quem é quem (qual e-mail corresponde a qual instância).

---

## Passo 4 — Supabase: rodar o SQL (liga a trava)

1. Abra **SQL Editor** no Supabase.
2. Cole o conteúdo do arquivo [`supabase/setup-multiusuario.sql`](supabase/setup-multiusuario.sql)
   inteiro e clique em **RUN**. (Pode rodar mais de uma vez sem problema.)
3. **Carimbe as mensagens que já existem** (as do seu WhatsApp atual), trocando
   pelo nome da sua instância:

   ```sql
   UPDATE messages SET instancia = 'ana' WHERE instancia IS NULL;
   ```

4. **Ligue cada login a uma instância.** Rode uma vez por atendente, trocando o
   e-mail e o nome da instância:

   ```sql
   INSERT INTO atendentes (user_id, instancia, nome)
   SELECT id, 'ana', 'Ana'
   FROM auth.users WHERE email = 'ana@suaempresa.com'
   ON CONFLICT (user_id, instancia) DO UPDATE SET nome = EXCLUDED.nome;
   ```

---

## Passo 5 — n8n: deixar o salvamento da sugestão passar pela trava

Com a trava ligada, o nó que **grava a sugestão no painel** precisa usar a chave
de servidor (a `service_role`), que tem permissão total. Os nós que gravam
mensagem/contato usam conexão direta ao Postgres e **não precisam mudar**.

1. No Supabase: **Settings → API** → copie a chave **`service_role`** (a secreta).
2. No n8n, abra o nó **"Salvar Sugestao no Painel"**. Nos cabeçalhos `apikey` e
   `Authorization`, troque a chave anônima pela **`service_role`**.
   - Se você usa o nó "Configurar Supabase" para guardar a chave, troque lá.

> A `service_role` só vive no n8n (servidor), nunca no navegador — por isso é
> seguro. **Nunca** coloque a `service_role` no `painel/index.html`.

---

## Passo 6 — Painel: já está pronto

O `painel/index.html` deste projeto **já foi atualizado** com a tela de login.
Não precisa configurar nada nele:

- Ao abrir, ele pede **e-mail e senha**.
- Depois do login, mostra só as mensagens do WhatsApp daquele atendente.
- Tem botão **Sair** no topo.
- Em modo demonstração (sem Supabase/internet), continua abrindo sem login, com
  dados de exemplo — útil para testar o visual.

É o **mesmo link** para os 6. Cada um entra com o seu login.

---

## Conferindo se deu certo

1. Abra o painel, entre com o login da **Ana** → deve ver só os mentorados que
   falaram com o WhatsApp da Ana.
2. Saia, entre com o login do **João** → lista diferente, só a dele.
3. Mande uma mensagem de teste para o WhatsApp de um deles e confirme que ela
   aparece **só** no painel da pessoa certa.

## Adicionar a 7ª, 8ª pessoa no futuro

Só dois passos: criar o WhatsApp na Evolution (passo 2) + criar o login e ligar
à instância no Supabase (passos 3 e 4, item 4). Nada de retrabalho.

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| Painel vazio depois do login | mensagens sem carimbo, ou login não ligado à instância | rode o `UPDATE` do passo 4.3 e o `INSERT` do passo 4.4 |
| Sugestões pararam de aparecer no n8n | o nó "Salvar Sugestao" ainda usa a chave anônima | troque pela `service_role` (passo 5) |
| Pessoa vê mensagens de outra | o carimbo (instancia) está igual para as duas | confira os nomes das instâncias na Evolution |
| "E-mail ou senha incorretos" | usuário não criado/confirmado | confira em Authentication → Users |
