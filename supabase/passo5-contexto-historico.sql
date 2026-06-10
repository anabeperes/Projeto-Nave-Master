-- ============================================================
--  Nave Master — Passo 5: histórico de conversa para o agente de Contexto
-- ------------------------------------------------------------
--  Cole TUDO no SQL Editor do Supabase e clique em RUN.
--  É seguro rodar mais de uma vez (idempotente).
--
--  O que ele faz, em uma frase:
--  cria a função get_conversation_context(numero), que devolve as últimas
--  mensagens JÁ TRATADAS de uma conversa (as que o mentorado mandou antes e
--  as que o navegador respondeu), em ordem cronológica e rotuladas, para o
--  agente de Contexto entender o fio da conversa antes de classificar/responder.
--
--  ⚠️ Rode este script ANTES de importar o "Workflow dash.json" novo, porque
--     a query "Buscar Conversas Nao Lidas" passou a chamar esta função.
--
--  Obs: a tabela messages usa id do tipo uuid (não dá pra ordenar por id para
--  saber o que é recente). Por isso ordenamos por received_at (quando a
--  mensagem chegou), com fallback para inserted_at/updated_at.
-- ============================================================

-- As mensagens "unread" (as que serão respondidas AGORA) ficam de fora:
-- elas já entram na cadeia como "mensagem atual". O histórico é o resto.
CREATE OR REPLACE FUNCTION get_conversation_context(
  p_whatsapp_number text,
  p_limit int DEFAULT 12
)
RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT string_agg(linha, E'\n' ORDER BY ts)
  FROM (
    SELECT
      COALESCE(received_at, inserted_at::timestamptz, updated_at::timestamptz) AS ts,
      CASE
        WHEN direction = 'outgoing' THEN '[navegador]: '
        ELSE '[mentorado]: '
      END || COALESCE(content, '') AS linha
    FROM messages
    WHERE whatsapp_number = p_whatsapp_number
      AND status IS DISTINCT FROM 'unread'   -- só o que já foi tratado
    ORDER BY ts DESC                          -- pega as MAIS RECENTES de verdade
    LIMIT p_limit
  ) sub;                                       -- e devolve em ordem cronológica
$$;

-- Conferência rápida (troque pelo número/lid de um mentorado real para testar):
-- SELECT get_conversation_context('11115476054162@lid', 12);
