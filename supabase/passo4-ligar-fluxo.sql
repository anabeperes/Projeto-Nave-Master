-- ============================================================
--  Nave Master — LIGAR a separação por atendente (multi-WhatsApp)
--  Projeto Mentoria Fluxo — script já preenchido.
-- ------------------------------------------------------------
--  Cole TUDO no SQL Editor do Supabase e clique em RUN.
--  É seguro rodar mais de uma vez (idempotente).
--
--  ⚠️ ANTES de rodar: faça a troca da chave no n8n (Passo 4.1 do guia),
--     trocando a chave dos nós "Configurar Supabase" e
--     "Configurar Supabase 18h" pela chave SECRETA (service_role).
--     Senão as sugestões param de salvar quando a trava ligar.
-- ============================================================


-- 1) CARIMBO ----------------------------------------------------------------
ALTER TABLE messages ADD COLUMN IF NOT EXISTS instancia text;
CREATE INDEX IF NOT EXISTS idx_messages_instancia ON messages (instancia);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp  ON messages (whatsapp_number);


-- 2) QUEM É CADA ATENDENTE (login -> instância) -----------------------------
CREATE TABLE IF NOT EXISTS atendentes (
  user_id   uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  instancia text        NOT NULL,
  nome      text,
  criado_em timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, instancia)
);
CREATE INDEX IF NOT EXISTS idx_atendentes_instancia ON atendentes (instancia);

CREATE OR REPLACE FUNCTION minhas_instancias()
RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT instancia FROM atendentes WHERE user_id = auth.uid();
$$;


-- 3) A TRAVA (RLS) ----------------------------------------------------------
ALTER TABLE messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sugestoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_messages_select ON messages;
CREATE POLICY p_messages_select ON messages
  FOR SELECT TO authenticated
  USING (instancia IN (SELECT minhas_instancias()));

DROP POLICY IF EXISTS p_contacts_select ON contacts;
CREATE POLICY p_contacts_select ON contacts
  FOR SELECT TO authenticated
  USING (whatsapp_number IN (
    SELECT whatsapp_number FROM messages WHERE instancia IN (SELECT minhas_instancias())
  ));

DROP POLICY IF EXISTS p_sugestoes_select ON sugestoes;
CREATE POLICY p_sugestoes_select ON sugestoes
  FOR SELECT TO authenticated
  USING (whatsapp_number IN (
    SELECT whatsapp_number FROM messages WHERE instancia IN (SELECT minhas_instancias())
  ));

DROP POLICY IF EXISTS p_sugestoes_update ON sugestoes;
CREATE POLICY p_sugestoes_update ON sugestoes
  FOR UPDATE TO authenticated
  USING (whatsapp_number IN (
    SELECT whatsapp_number FROM messages WHERE instancia IN (SELECT minhas_instancias())
  ));

DROP POLICY IF EXISTS p_atendentes_select ON atendentes;
CREATE POLICY p_atendentes_select ON atendentes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE relatorios_diarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_relatorios_select ON relatorios_diarios;
CREATE POLICY p_relatorios_select ON relatorios_diarios
  FOR SELECT TO authenticated
  USING (true);


-- 4) CARIMBAR AS MENSAGENS ANTIGAS ------------------------------------------
--    Tudo que já estava no banco veio do seu WhatsApp (wa2), pois só ele
--    mandava pro n8n até agora. Carimba retroativamente como 'wa2'.
UPDATE messages SET instancia = 'wa2' WHERE instancia IS NULL;


-- 5) LIGAR CADA LOGIN À SUA INSTÂNCIA ---------------------------------------
--    Os nomes das instâncias são EXATOS (maiúsculas/minúsculas como na Evolution).
INSERT INTO atendentes (user_id, instancia, nome)
SELECT id, 'wa2', 'Ana' FROM auth.users WHERE email = 'ana@vtsd.com.br'
ON CONFLICT (user_id, instancia) DO UPDATE SET nome = EXCLUDED.nome;

INSERT INTO atendentes (user_id, instancia, nome)
SELECT id, 'manu', 'Emanuelle' FROM auth.users WHERE email = 'emanuelle@vtsd.com.br'
ON CONFLICT (user_id, instancia) DO UPDATE SET nome = EXCLUDED.nome;

INSERT INTO atendentes (user_id, instancia, nome)
SELECT id, 'Darah', 'Darah' FROM auth.users WHERE email = 'darah@vtsd.com.br'
ON CONFLICT (user_id, instancia) DO UPDATE SET nome = EXCLUDED.nome;

INSERT INTO atendentes (user_id, instancia, nome)
SELECT id, 'Livia', 'Lívia' FROM auth.users WHERE email = 'livia@vtsd.com.br'
ON CONFLICT (user_id, instancia) DO UPDATE SET nome = EXCLUDED.nome;

INSERT INTO atendentes (user_id, instancia, nome)
SELECT id, 'Felipe', 'Felipe' FROM auth.users WHERE email = 'felipefae@vtsd.com.br'
ON CONFLICT (user_id, instancia) DO UPDATE SET nome = EXCLUDED.nome;

INSERT INTO atendentes (user_id, instancia, nome)
SELECT id, 'Ruan', 'Ruam' FROM auth.users WHERE email = 'ruam@vtsd.com.br'
ON CONFLICT (user_id, instancia) DO UPDATE SET nome = EXCLUDED.nome;

INSERT INTO atendentes (user_id, instancia, nome)
SELECT id, 'Robson', 'Robson' FROM auth.users WHERE email = 'robson@vtsd.com.br'
ON CONFLICT (user_id, instancia) DO UPDATE SET nome = EXCLUDED.nome;


-- 6) CONFERÊNCIA ------------------------------------------------------------
--    Deve listar as 7 linhas, cada login com sua instância.
--    Se alguma faltar, o usuário daquele e-mail ainda não foi criado em
--    Authentication > Users.
SELECT a.instancia, a.nome, u.email
FROM atendentes a JOIN auth.users u ON u.id = a.user_id
ORDER BY a.instancia;
