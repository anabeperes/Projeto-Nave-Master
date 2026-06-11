-- ============================================================
--  Nave Master — Passo 6: correções dos bugs reportados (10-11/06)
-- ------------------------------------------------------------
--  Cole TUDO no SQL Editor do Supabase e clique em RUN.
--  É seguro rodar mais de uma vez (idempotente).
--
--  ⚠️ Rode este script JUNTO com a importação do "WF-11-06.json":
--     o nó "Buscar Stats do Dia" passou a chamar a função nova
--     get_daily_stats_por_instancia() criada aqui.
--
--  Colunas de data usadas (conferidas no schema real da tabela):
--    received_at = quando a mensagem chegou
--    read_at     = quando a conversa foi marcada como respondida
-- ============================================================


-- ============================================================
-- BUG 4 — Relatório diário mostrava o aglomerado de TODOS os
-- navegadores (99 mensagens, mentorados de outras instâncias).
-- Causa: get_daily_stats() soma o banco inteiro e a tabela
-- relatorios_diarios tinha política "todo mundo vê tudo".
-- Correção: uma linha de relatório POR INSTÂNCIA + trava (RLS)
-- para cada navegador ver só a sua.
-- ============================================================

ALTER TABLE relatorios_diarios ADD COLUMN IF NOT EXISTS instancia text;
CREATE INDEX IF NOT EXISTS idx_relatorios_instancia ON relatorios_diarios (instancia, data);

-- Cada navegador vê só o relatório da sua instância.
-- (Relatórios antigos, gravados sem instância, deixam de aparecer —
--  eles eram justamente o aglomerado global.)
DROP POLICY IF EXISTS p_relatorios_select ON relatorios_diarios;
CREATE POLICY p_relatorios_select ON relatorios_diarios
  FOR SELECT TO authenticated
  USING (instancia IN (SELECT minhas_instancias()));

-- Estatísticas do dia separadas por instância (uma linha por navegador).
-- Tempo de resposta = read_at - received_at (do recebimento da mensagem
-- até a conversa ser marcada como respondida).
CREATE OR REPLACE FUNCTION get_daily_stats_por_instancia(p_data date)
RETURNS TABLE (
  instancia            text,
  total_mensagens      bigint,
  mentorados_unicos    bigint,
  nomes_unicos         text,
  mensagens_respondidas bigint,
  mensagens_pendentes  bigint,
  tempo_medio_min      numeric,
  tempo_mediano_min    numeric,
  tempo_max_min        numeric,
  tempo_min_min        numeric
)
LANGUAGE sql STABLE AS $$
  WITH recebidas AS (
    SELECT
      m.instancia,
      m.whatsapp_number,
      m.contact_name,
      m.received_at,
      m.read_at,
      m.status
    FROM messages m
    WHERE m.direction = 'incoming'
      AND (m.received_at AT TIME ZONE 'America/Sao_Paulo')::date = p_data
  )
  SELECT
    COALESCE(r.instancia, 'sem_instancia')                                AS instancia,
    count(*)                                                              AS total_mensagens,
    count(DISTINCT r.whatsapp_number)                                     AS mentorados_unicos,
    string_agg(DISTINCT COALESCE(NULLIF(r.contact_name, ''), r.whatsapp_number), ', ') AS nomes_unicos,
    count(*) FILTER (WHERE r.read_at IS NOT NULL OR r.status = 'read')    AS mensagens_respondidas,
    count(*) FILTER (WHERE r.read_at IS NULL AND r.status IS DISTINCT FROM 'read') AS mensagens_pendentes,
    round(avg(EXTRACT(EPOCH FROM (r.read_at - r.received_at)) / 60)::numeric, 1)  AS tempo_medio_min,
    round((percentile_cont(0.5) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (r.read_at - r.received_at)) / 60))::numeric, 1) AS tempo_mediano_min,
    round(max(EXTRACT(EPOCH FROM (r.read_at - r.received_at)) / 60)::numeric, 1)  AS tempo_max_min,
    round(min(EXTRACT(EPOCH FROM (r.read_at - r.received_at)) / 60)::numeric, 1)  AS tempo_min_min
  FROM recebidas r
  GROUP BY COALESCE(r.instancia, 'sem_instancia');
$$;

-- Conferência rápida (deve listar uma linha por instância com mensagens hoje):
-- SELECT * FROM get_daily_stats_por_instancia(CURRENT_DATE);


-- ============================================================
-- BUG 2 — Cartões "presos"/duplicados (caso Igor Braga, 600h+).
-- Causa: mensagens antigas paradas como 'unread' regeneravam
-- sugestão toda vez que a anterior saía de "pendente".
-- O workflow novo já impede regenerar; o bloco abaixo faz a
-- LIMPEZA do que já está preso no banco.
-- ============================================================

-- 2a-0) A trava de status das sugestões precisa conhecer o valor
--       'substituida' (usado pelo WF-11-06 e pela limpeza abaixo):
ALTER TABLE sugestoes DROP CONSTRAINT IF EXISTS sugestoes_status_check;
ALTER TABLE sugestoes ADD CONSTRAINT sugestoes_status_check
  CHECK (status IN ('pendente', 'enviada', 'substituida')) NOT VALID;

-- 2a) Conferir o tamanho do problema antes de limpar:
SELECT count(*) AS mensagens_unread_com_mais_de_7_dias
FROM messages
WHERE status = 'unread'
  AND received_at < now() - interval '7 days';

-- 2b) DESCOMENTE para marcar como lidas as mensagens presas há mais
--     de 7 dias (elas continuam no histórico, só param de gerar cartão):
-- UPDATE messages SET status = 'read'
--  WHERE status = 'unread' AND received_at < now() - interval '7 days';

-- 2c) DESCOMENTE para arquivar sugestões pendentes duplicadas,
--     mantendo só a mais recente de cada mentorado:
-- WITH ranked AS (
--   SELECT id, row_number() OVER (
--     PARTITION BY whatsapp_number ORDER BY criada_em DESC) AS rn
--   FROM sugestoes WHERE status = 'pendente'
-- )
-- UPDATE sugestoes s SET status = 'substituida'
--   FROM ranked r WHERE s.id = r.id AND r.rn > 1;


-- ============================================================
-- BUG 6 (sequela) — Linhas corrompidas pela vírgula.
-- O bug das vírgulas gravava pedaços de mensagem nos campos
-- evolution_msg_id e instancia. Este SELECT lista as linhas
-- suspeitas (instancia fora da lista oficial) para você revisar:
-- ============================================================
SELECT id, whatsapp_number, contact_name, direction, content,
       evolution_msg_id, instancia, received_at
FROM messages
WHERE instancia IS NOT NULL
  AND instancia NOT IN ('wa2', 'manu', 'Darah', 'Livia', 'Felipe', 'Ruan', 'Robson')
ORDER BY received_at DESC;

-- Para corrigir uma linha suspeita (exemplo — ajuste id e instância):
-- UPDATE messages SET instancia = 'manu', evolution_msg_id = 'corrigido-' || id
--  WHERE id = '...cole-o-id-aqui...';


-- ============================================================
-- CONFERÊNCIAS FINAIS
-- ============================================================

-- A trava (RLS) está ligada nas tabelas? (todas devem retornar "true")
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('messages', 'contacts', 'sugestoes', 'relatorios_diarios');

-- Contatos @lid criados pelo bug (devem parar de surgir com o WF-11-06):
-- (a tabela contacts nao tem contact_name; o nome fica na coluna "name")
SELECT whatsapp_number
FROM contacts
WHERE whatsapp_number LIKE '%@lid%' OR whatsapp_number !~ '^[0-9]+$';
