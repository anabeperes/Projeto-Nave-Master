-- ============================================================
--  Nave Master — separação por atendente (multi-WhatsApp)
-- ------------------------------------------------------------
--  Cole este script INTEIRO no SQL Editor do Supabase e clique em RUN.
--  É seguro rodar mais de uma vez (idempotente).
--
--  O que ele faz, em uma frase:
--  carimba cada mensagem com a instância (o WhatsApp que recebeu) e
--  liga a trava (RLS) para que cada atendente logado só enxergue as
--  mensagens, contatos e sugestões do SEU WhatsApp.
--
--  A "fonte da verdade" é messages.instancia. Contatos e sugestões
--  herdam o dono pelo número do mentorado (whatsapp_number) — por isso
--  você só precisa carimbar a tabela messages lá no n8n.
-- ============================================================

-- 1) CARIMBO ----------------------------------------------------------------
--    De qual instância (WhatsApp) veio a mensagem. O n8n vai preencher isso.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS instancia text;

-- Índices para os filtros ficarem rápidos
CREATE INDEX IF NOT EXISTS idx_messages_instancia ON messages (instancia);
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp  ON messages (whatsapp_number);


-- 2) QUEM É CADA ATENDENTE ---------------------------------------------------
--    Liga o login (Supabase Auth) à instância que ele pode ver.
--    Um atendente pode, se quiser, ver mais de uma instância (basta 2 linhas).
CREATE TABLE IF NOT EXISTS atendentes (
  user_id   uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  instancia text        NOT NULL,
  nome      text,
  criado_em timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, instancia)
);
CREATE INDEX IF NOT EXISTS idx_atendentes_instancia ON atendentes (instancia);

-- Função auxiliar: as instâncias que o usuário logado pode ver.
-- SECURITY DEFINER faz a checagem rodar com privilégio, sem laço de RLS.
CREATE OR REPLACE FUNCTION minhas_instancias()
RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT instancia FROM atendentes WHERE user_id = auth.uid();
$$;


-- 3) A TRAVA (RLS) -----------------------------------------------------------
ALTER TABLE messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sugestoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendentes ENABLE ROW LEVEL SECURITY;

-- messages: vê só as mensagens da sua instância
DROP POLICY IF EXISTS p_messages_select ON messages;
CREATE POLICY p_messages_select ON messages
  FOR SELECT TO authenticated
  USING (instancia IN (SELECT minhas_instancias()));

-- contacts: o contato pertence a quem trocou mensagem com ele
DROP POLICY IF EXISTS p_contacts_select ON contacts;
CREATE POLICY p_contacts_select ON contacts
  FOR SELECT TO authenticated
  USING (whatsapp_number IN (
    SELECT whatsapp_number FROM messages WHERE instancia IN (SELECT minhas_instancias())
  ));

-- sugestoes: a sugestão herda o dono pelo número do mentorado
DROP POLICY IF EXISTS p_sugestoes_select ON sugestoes;
CREATE POLICY p_sugestoes_select ON sugestoes
  FOR SELECT TO authenticated
  USING (whatsapp_number IN (
    SELECT whatsapp_number FROM messages WHERE instancia IN (SELECT minhas_instancias())
  ));

-- o painel também marca como enviada / salva edição da sugestão (UPDATE)
DROP POLICY IF EXISTS p_sugestoes_update ON sugestoes;
CREATE POLICY p_sugestoes_update ON sugestoes
  FOR UPDATE TO authenticated
  USING (whatsapp_number IN (
    SELECT whatsapp_number FROM messages WHERE instancia IN (SELECT minhas_instancias())
  ));

-- atendentes: cada um lê só o próprio vínculo
DROP POLICY IF EXISTS p_atendentes_select ON atendentes;
CREATE POLICY p_atendentes_select ON atendentes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());


-- 4) RELATÓRIO DIÁRIO --------------------------------------------------------
--    Hoje o relatório é um total geral (não separado por atendente).
--    Para liberar a leitura a quem está logado, sem quebrar o painel:
ALTER TABLE relatorios_diarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_relatorios_select ON relatorios_diarios;
CREATE POLICY p_relatorios_select ON relatorios_diarios
  FOR SELECT TO authenticated
  USING (true);
-- OBS: separar o relatório POR atendente é um passo futuro (precisaria
-- agrupar a geração do relatório por instancia). Por ora todos veem o total.


-- ============================================================
--  COMO LIGAR CADA LOGIN A UM WHATSAPP
-- ------------------------------------------------------------
--  Depois de criar os usuários em Authentication > Users, rode UMA vez
--  por atendente, trocando o e-mail e o nome da instância (o mesmo nome
--  que você deu à instância na Evolution API).
--
--  Exemplo:
--
--  INSERT INTO atendentes (user_id, instancia, nome)
--  SELECT id, 'ana', 'Ana'
--  FROM auth.users WHERE email = 'ana@suaempresa.com'
--  ON CONFLICT (user_id, instancia) DO UPDATE SET nome = EXCLUDED.nome;
--
--  Repita para joao -> 'joao', maria -> 'maria', etc.
-- ============================================================
