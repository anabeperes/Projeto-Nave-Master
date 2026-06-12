-- ============================================================
--  Nave Master — Passo 8: fechar as políticas "anon"
-- ------------------------------------------------------------
--  ⚠️ RODE SOMENTE DEPOIS que o WF-12/06 estiver ATIVO no n8n com a
--     chave SECRETA (sb_secret_...) nos nós "Configurar Supabase" e
--     "Configurar Supabase 18h". Se rodar antes, o n8n (que hoje usa a
--     chave pública) PARA de salvar sugestões e o relatório das 18h.
--
--  O que ele faz: remove as políticas que deixavam QUALQUER pessoa com
--  a chave pública (que está no HTML do painel) ler e editar todas as
--  sugestões, contatos e relatórios — sem login. Elas foram criadas como
--  atalho para o n8n gravar sem a chave secreta.
--
--  Depois deste passo:
--   - painel: só logado, cada navegador vê só a sua instância (passo 7);
--   - n8n: grava com a chave secreta (service_role), que ignora a trava.
-- ============================================================

DROP POLICY IF EXISTS "permitir select anon" ON sugestoes;
DROP POLICY IF EXISTS "permitir insert anon" ON sugestoes;
DROP POLICY IF EXISTS "permitir update anon" ON sugestoes;

DROP POLICY IF EXISTS "permitir select anon" ON contacts;

DROP POLICY IF EXISTS "permitir select anon" ON relatorios_diarios;
DROP POLICY IF EXISTS "permitir insert anon" ON relatorios_diarios;

-- ============================================================
--  CONFERÊNCIA: não pode sobrar política com role {anon}
-- ============================================================
SELECT tablename, policyname, roles::text AS roles, cmd
FROM pg_policies
WHERE tablename IN ('messages','contacts','sugestoes','atendentes','relatorios_diarios')
ORDER BY tablename, policyname;
