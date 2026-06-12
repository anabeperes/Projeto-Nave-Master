-- ============================================================
-- PASSO 7 — Ordenar a fila pela hora da MENSAGEM, não do robô
--
-- Problema: o painel ordenava por criada_em, que é a hora em que
-- o robô GEROU o card (em lotes de hora em hora). Uma conversa
-- parada há dias podia aparecer acima de uma mensagem que acabou
-- de chegar, só porque o card dela foi gerado no lote mais novo.
--
-- A partir do WF-11-06 atualizado, o n8n grava em cada sugestão a
-- hora da última mensagem do mentorado (ultima_mensagem_em), e o
-- painel ordena por ela.
--
-- IMPORTANTE: rode este arquivo ANTES de importar o workflow
-- atualizado no n8n — sem a coluna, o INSERT da sugestão falha.
-- ============================================================

-- 1) A coluna nova (segura de rodar mais de uma vez):
ALTER TABLE sugestoes
  ADD COLUMN IF NOT EXISTS ultima_mensagem_em timestamptz;

-- 2) Backfill dos cards já existentes: usa a mensagem mais recente
--    do mentorado ATÉ a criação do card (a mesma que deu origem a ele).
UPDATE sugestoes s
   SET ultima_mensagem_em = (
     SELECT max(m.received_at)
       FROM messages m
      WHERE m.whatsapp_number = s.whatsapp_number
        AND m.direction = 'incoming'
        AND m.received_at <= s.criada_em
   )
 WHERE s.ultima_mensagem_em IS NULL;

-- 3) Conferência: deve sobrar 0 (ou só cards sem mensagem correspondente,
--    que o painel ordena pela criada_em como antes):
SELECT count(*) AS sugestoes_sem_hora_de_mensagem
  FROM sugestoes
 WHERE ultima_mensagem_em IS NULL;
