-- ============================================================
--  Nave Master — Passo 7: cada navegador vê só as SUAS sugestões
--  (corrige o painel "embaralhado" entre os navegadores)
-- ------------------------------------------------------------
--  Cole TUDO no SQL Editor do Supabase e clique em RUN.
--  É seguro rodar mais de uma vez (idempotente).
--
--  ⚠️ Rode este script JUNTO com a importação do "WF-12-06.json":
--     o workflow novo grava o carimbo (instancia) em toda sugestão.
--
--  O problema: a trava das sugestões filtrava pelo NÚMERO do mentorado,
--  herdando o dono pela tabela messages. Só que (a) o histórico antigo
--  foi todo carimbado como 'wa2' (passo 4) e (b) há mentorados com
--  mensagem em mais de uma instância. Resultado: a mesma sugestão
--  aparecia no painel de vários navegadores ao mesmo tempo.
--
--  A correção: a sugestão passa a ter o PRÓPRIO carimbo (instancia) e a
--  trava usa esse carimbo direto. O dono de um mentorado é a instância
--  da mensagem RECEBIDA mais recente dele (se trocou de nave, vale a atual).
--
--  Mapa oficial (instância exata da Evolution -> navegador):
--    wa2 -> Ana          | manu  -> Manu (Emanuelle)
--    Robson -> Robson    | Livia -> Lívia
--    Ruan -> Ruam        | Darah -> Darah        | Felipe -> Felipe
-- ============================================================


-- 1) CARIMBO NA SUGESTÃO ------------------------------------------------------
ALTER TABLE sugestoes ADD COLUMN IF NOT EXISTS instancia text;
CREATE INDEX IF NOT EXISTS idx_sugestoes_instancia ON sugestoes (instancia);


-- 2) DONO ATUAL DE UM MENTORADO ----------------------------------------------
--    A instância da mensagem recebida mais recente daquele número.
--    SECURITY DEFINER: a checagem roda com privilégio, sem laço de RLS.
CREATE OR REPLACE FUNCTION dono_atual(p_numero text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT instancia FROM messages
  WHERE whatsapp_number = p_numero
    AND direction = 'incoming'
    AND instancia IS NOT NULL
  ORDER BY received_at DESC
  LIMIT 1;
$$;


-- 3) CARIMBAR AS SUGESTÕES QUE JÁ EXISTEM --------------------------------------
--    Cada sugestão herda o dono atual do mentorado. Re-carimba também as que
--    estavam com carimbo desatualizado (mentorado que trocou de nave).
UPDATE sugestoes s
SET instancia = ult.instancia
FROM (
  SELECT DISTINCT ON (whatsapp_number) whatsapp_number, instancia
  FROM messages
  WHERE direction = 'incoming' AND instancia IS NOT NULL
  ORDER BY whatsapp_number, received_at DESC
) ult
WHERE s.whatsapp_number = ult.whatsapp_number
  AND (s.instancia IS NULL OR s.instancia <> ult.instancia);


-- 4) TRAVA DIRETA PELO CARIMBO --------------------------------------------------
--    Sugestão sem carimbo não aparece para NINGUÉM (antes aparecia para todos).
--    O WF-12-06 grava o carimbo em toda sugestão nova.
DROP POLICY IF EXISTS p_sugestoes_select ON sugestoes;
CREATE POLICY p_sugestoes_select ON sugestoes
  FOR SELECT TO authenticated
  USING (instancia IN (SELECT minhas_instancias()));

DROP POLICY IF EXISTS p_sugestoes_update ON sugestoes;
CREATE POLICY p_sugestoes_update ON sugestoes
  FOR UPDATE TO authenticated
  USING (instancia IN (SELECT minhas_instancias()));

-- Contatos (aba Métricas) seguem a mesma regra do dono atual: o mentorado
-- aparece só para a nave da última mensagem dele (antes, quem tinha QUALQUER
-- mensagem antiga com o número via o contato — ex.: todo o histórico 'wa2').
DROP POLICY IF EXISTS p_contacts_select ON contacts;
CREATE POLICY p_contacts_select ON contacts
  FOR SELECT TO authenticated
  USING (dono_atual(whatsapp_number) IN (SELECT minhas_instancias()));


-- 5) LIGAR (E CORRIGIR) CADA LOGIN À SUA INSTÂNCIA ------------------------------
--    Remove vínculo errado (ex.: login apontando para instância de outra pessoa)
--    e garante o mapa oficial. Os nomes de instância são EXATOS
--    (maiúsculas/minúsculas como estão na Evolution API).
DELETE FROM atendentes a
USING auth.users u
WHERE a.user_id = u.id
  AND u.email IN ('ana@vtsd.com.br', 'emanuelle@vtsd.com.br', 'darah@vtsd.com.br',
                  'livia@vtsd.com.br', 'felipefae@vtsd.com.br', 'ruam@vtsd.com.br',
                  'robson@vtsd.com.br')
  AND (u.email, a.instancia) NOT IN (
    ('ana@vtsd.com.br',       'wa2'),
    ('emanuelle@vtsd.com.br', 'manu'),
    ('darah@vtsd.com.br',     'Darah'),
    ('livia@vtsd.com.br',     'Livia'),
    ('felipefae@vtsd.com.br', 'Felipe'),
    ('ruam@vtsd.com.br',      'Ruan'),
    ('robson@vtsd.com.br',    'Robson')
  );

INSERT INTO atendentes (user_id, instancia, nome)
SELECT u.id, m.instancia, m.nome
FROM (VALUES
    ('ana@vtsd.com.br',       'wa2',    'Ana'),
    ('emanuelle@vtsd.com.br', 'manu',   'Manu'),
    ('darah@vtsd.com.br',     'Darah',  'Darah'),
    ('livia@vtsd.com.br',     'Livia',  'Lívia'),
    ('felipefae@vtsd.com.br', 'Felipe', 'Felipe'),
    ('ruam@vtsd.com.br',      'Ruan',   'Ruam'),
    ('robson@vtsd.com.br',    'Robson', 'Robson')
) AS m(email, instancia, nome)
JOIN auth.users u ON u.email = m.email
ON CONFLICT (user_id, instancia) DO UPDATE SET nome = EXCLUDED.nome;


-- ============================================================
--  CONFERÊNCIAS (saem no resultado do RUN)
-- ============================================================

-- (a) Cada login com a sua instância — deve listar 7 linhas, uma por pessoa.
--     Se faltar alguém, o usuário daquele e-mail não existe em
--     Authentication > Users (criar e rodar este script de novo).
SELECT u.email, a.instancia, a.nome
FROM atendentes a JOIN auth.users u ON u.id = a.user_id
ORDER BY a.instancia;

-- (b) Instâncias que estão chegando nas mensagens — os nomes têm que bater
--     EXATAMENTE com o mapa acima ('wa2', 'manu', 'Darah', 'Livia', 'Felipe',
--     'Ruan', 'Robson'). Nome fora da lista = webhook da Evolution com o nome
--     de instância diferente do esperado.
SELECT COALESCE(instancia, '(sem carimbo)') AS instancia,
       count(*) AS mensagens,
       max(received_at) AS ultima_mensagem
FROM messages
GROUP BY 1 ORDER BY 1;

-- (c) O que cada navegador vai ver no painel a partir de agora:
SELECT COALESCE(instancia, '(sem carimbo — invisível)') AS instancia,
       count(*) FILTER (WHERE status = 'pendente') AS pendentes,
       count(*) AS total
FROM sugestoes
GROUP BY 1 ORDER BY 1;
