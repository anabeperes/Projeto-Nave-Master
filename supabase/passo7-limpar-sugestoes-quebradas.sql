-- ============================================================
--  Nave Master — Passo 7: limpar sugestões quebradas (12/06)
-- ------------------------------------------------------------
--  Contexto: cards no painel mostrando a saída CRUA do roteador
--  ("CATEGORIA: ... PERFIL_ESTILO: ... INSTRUÇÃO_PARA_REDATOR: ...")
--  ou a mensagem de erro do Redator ("o conteúdo do especialista
--  chegou vazio") no lugar da resposta pronta. Esses cards têm os
--  badges MEDIA + NAO_MAPEADA (valores de fallback).
--
--  Por que DELETE e não arquivar: o filtro do workflow ("Filtrar Ja
--  Sugeridas") considera a última sugestão de QUALQUER status. Se a
--  linha quebrada continuar no banco (mesmo como 'substituida'), a
--  conversa só ganharia card novo quando o mentorado mandasse outra
--  mensagem. Apagando a linha, a próxima rodada (de hora em hora)
--  regenera a sugestão na hora — agora pela cadeia corrigida.
--
--  ⚠️ Rode JUNTO com a reimportação do "WF-11-06.json" atualizado.
--     Sem o workflow novo no n8n, os cards quebrados voltam.
--
--  É seguro rodar mais de uma vez (idempotente).
-- ============================================================

-- ------------------------------------------------------------
-- 1) PRÉVIA — confira o que vai ser apagado antes de rodar o 2.
-- ------------------------------------------------------------
SELECT id, contact_name, whatsapp_number, intencao, urgencia, criada_em,
       left(sugestao_resposta, 120) AS inicio_da_sugestao
  FROM sugestoes
 WHERE status = 'pendente'
   AND (
         sugestao_resposta LIKE 'CATEGORIA:%'                          -- saída crua do roteador
      OR sugestao_resposta LIKE '%PERFIL_ESTILO:%'                     -- bloco de perfil vazou
      OR sugestao_resposta LIKE '%INSTRUÇÃO_PARA_REDATOR%'             -- idem
      OR sugestao_resposta ILIKE '%problema no processamento%'         -- meta-erro do Redator
      OR sugestao_resposta ILIKE '%especialista chegou vazio%'         -- idem
   )
 ORDER BY criada_em DESC;

-- ------------------------------------------------------------
-- 2) LIMPEZA — apaga os cards quebrados listados acima.
-- ------------------------------------------------------------
DELETE FROM sugestoes
 WHERE status = 'pendente'
   AND (
         sugestao_resposta LIKE 'CATEGORIA:%'
      OR sugestao_resposta LIKE '%PERFIL_ESTILO:%'
      OR sugestao_resposta LIKE '%INSTRUÇÃO_PARA_REDATOR%'
      OR sugestao_resposta ILIKE '%problema no processamento%'
      OR sugestao_resposta ILIKE '%especialista chegou vazio%'
   );

-- ------------------------------------------------------------
-- 3) OPCIONAL — sobras com NAO_MAPEADA que escaparam dos padrões
--    acima. Na cadeia atual a categoria sempre tem fallback
--    ('SUPORTE'), então NAO_MAPEADA pendente = item que passou pelo
--    caminho de erro. Revise com o SELECT antes de descomentar.
-- ------------------------------------------------------------
-- SELECT id, contact_name, intencao, criada_em, left(sugestao_resposta, 120)
--   FROM sugestoes WHERE status = 'pendente' AND intencao = 'NAO_MAPEADA';
--
-- DELETE FROM sugestoes WHERE status = 'pendente' AND intencao = 'NAO_MAPEADA';
