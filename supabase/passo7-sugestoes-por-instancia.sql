-- ============================================================
--  Nave Master — Passo 7: cada navegador vê só as SUAS sugestões
--  (corrige o painel "embaralhado" entre os navegadores)
-- ------------------------------------------------------------
--  ✅ EXECUTADO em 12/06/2026 direto no banco (via Management API).
--  Fica aqui como registro e pode ser rodado de novo sem problema
--  (idempotente).
--
--  O que estava acontecendo (conferido no banco em 12/06):
--  1. A trava das sugestões filtrava pelo NÚMERO do mentorado, herdando
--     o dono pela tabela messages. O histórico antigo (3.173 mensagens)
--     era todo da 'wa2' e havia mentorados com mensagem em mais de uma
--     instância -> a mesma sugestão aparecia para vários navegadores.
--  2. 1.022 mensagens estavam com o carimbo (instancia) CORROMPIDO pelo
--     bug da vírgula do WF-10/06 (pedaços de mensagem e IDs no campo).
--     O lixo parou em 11/06 às 17:20, quando o WF-11/06 entrou.
--  3. A sugestão era gravada SEM carimbo próprio.
--
--  Mapa oficial (instância exata da Evolution -> navegador):
--    wa2 -> Ana          | manu  -> Manu (Emanuelle)
--    Robson -> Robson    | Livia -> Lívia
--    Ruan -> Ruam        | Darah -> Darah        | Felipe -> Felipe
-- ============================================================


-- 0) TRAVA LIGADA (já estava; no-op idempotente) -------------------------------
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sugestoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendentes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_diarios ENABLE ROW LEVEL SECURITY;


-- 1) CARIMBO NA SUGESTÃO --------------------------------------------------------
ALTER TABLE sugestoes ADD COLUMN IF NOT EXISTS instancia text;
CREATE INDEX IF NOT EXISTS idx_sugestoes_instancia ON sugestoes (instancia);


-- 2) LIMPAR OS CARIMBOS CORROMPIDOS PELO BUG DA VÍRGULA -------------------------
--    (pedaços de mensagem/IDs no campo instancia viram NULL)
UPDATE messages SET instancia = NULL
WHERE instancia IS NOT NULL
  AND instancia NOT IN ('wa2','manu','Darah','Livia','Felipe','Ruan','Robson');


-- 3) DONO ATUAL DE UM MENTORADO --------------------------------------------------
--    A instância (válida) da mensagem mais recente daquele número, em QUALQUER
--    direção — mensagem enviada pelo navegador também identifica o dono (isso
--    recupera conversas @lid cujas mensagens recebidas ficaram sem carimbo).
--    SECURITY DEFINER: a checagem roda com privilégio, sem laço de RLS.
CREATE OR REPLACE FUNCTION dono_atual(p_numero text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT instancia FROM messages
  WHERE whatsapp_number = p_numero
    AND instancia IN ('wa2','manu','Darah','Livia','Felipe','Ruan','Robson')
  ORDER BY received_at DESC
  LIMIT 1;
$$;


-- 4) CARIMBAR AS SUGESTÕES EXISTENTES --------------------------------------------
UPDATE sugestoes s SET instancia = dono_atual(s.whatsapp_number)
WHERE s.instancia IS NULL
   OR s.instancia NOT IN ('wa2','manu','Darah','Livia','Felipe','Ruan','Robson');


-- 5) GATILHO: SUGESTÃO NOVA GANHA O CARIMBO AUTOMATICAMENTE ----------------------
--    Mesmo que o workflow grave sem instancia (WF-11/06), o banco carimba
--    sozinho com o dono atual. O WF-12-06 também envia o carimbo (redundância).
CREATE OR REPLACE FUNCTION sugestoes_carimbo_automatico()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF NEW.instancia IS NULL THEN
    NEW.instancia := dono_atual(NEW.whatsapp_number);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sugestoes_carimbo ON sugestoes;
CREATE TRIGGER trg_sugestoes_carimbo BEFORE INSERT ON sugestoes
FOR EACH ROW EXECUTE FUNCTION sugestoes_carimbo_automatico();


-- 6) TRAVA DIRETA PELO CARIMBO ----------------------------------------------------
--    Sugestão sem carimbo não aparece para NINGUÉM (antes aparecia para todos).
DROP POLICY IF EXISTS p_sugestoes_select ON sugestoes;
CREATE POLICY p_sugestoes_select ON sugestoes
  FOR SELECT TO authenticated
  USING (instancia IN (SELECT minhas_instancias()));

DROP POLICY IF EXISTS p_sugestoes_update ON sugestoes;
CREATE POLICY p_sugestoes_update ON sugestoes
  FOR UPDATE TO authenticated
  USING (instancia IN (SELECT minhas_instancias()));

-- Contatos (aba Métricas) seguem a regra do dono atual.
DROP POLICY IF EXISTS p_contacts_select ON contacts;
CREATE POLICY p_contacts_select ON contacts
  FOR SELECT TO authenticated
  USING (dono_atual(whatsapp_number) IN (SELECT minhas_instancias()));

-- OBS: o mapa login -> instância na tabela atendentes foi conferido em 12/06
-- e já estava correto (os 7 vínculos). Se precisar recriar, use o passo 4.


-- ============================================================
--  CONFERÊNCIAS
-- ============================================================

-- (a) Cada login com a sua instância — deve listar 7 linhas.
SELECT u.email, a.instancia, a.nome
FROM atendentes a JOIN auth.users u ON u.id = a.user_id
ORDER BY a.instancia;

-- (b) O que cada navegador vê no painel:
SELECT COALESCE(instancia, '(sem carimbo — invisível)') AS instancia,
       count(*) FILTER (WHERE status = 'pendente') AS pendentes,
       count(*) AS total
FROM sugestoes
GROUP BY 1 ORDER BY 1;

-- (c) Carimbos chegando nas mensagens (só os 7 nomes oficiais + null):
SELECT COALESCE(instancia, '(null)') AS instancia, count(*) AS msgs,
       max(received_at) AS ultima
FROM messages GROUP BY 1 ORDER BY 1;

-- ⚠️ AINDA ABERTO: as políticas anon ("permitir select/insert/update anon")
-- continuam existindo — qualquer pessoa com a chave pública lê/edita as
-- sugestões. Elas só podem ser removidas DEPOIS que o n8n estiver com a
-- chave secreta (WF-12-06). Ver supabase/passo8-fechar-anon.sql.
