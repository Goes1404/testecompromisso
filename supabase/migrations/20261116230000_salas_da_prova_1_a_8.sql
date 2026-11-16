-- Simulado Pré-Etec (coordenação, 16/11, à noite): as salas da prova vão só
-- da 1 à 8, todas de prova (a 8 deixa de ser reserva), 40 lugares cada (320).
-- As salas 9 a 12 saem. Quem já estava na 9 ou na 11 vai para a sala 1–8 com
-- menos alunos, evitando a sala dele no cursinho (sala_origem).

-- 9–12 viram reserva primeiro, para a busca de sala livre não escolher nenhuma delas.
UPDATE public.matricula_salas SET reserva = (sala > 8), capacidade = 40, foco = 'ETEC' WHERE ano = 2027;

DO $$
DECLARE v_m RECORD; v_sala INT;
BEGIN
  FOR v_m IN
    SELECT id, sala_origem FROM public.matriculas
     WHERE ano = 2027 AND sala > 8 ORDER BY numero
  LOOP
    v_sala := public.sala_livre_da_matricula(2027, 'ETEC', v_m.sala_origem);
    IF v_sala IS NOT NULL THEN
      UPDATE public.matriculas SET sala = v_sala WHERE id = v_m.id;
    END IF;
  END LOOP;
END $$;

-- Sala vazia acima da 8 sai (com aluno, o gatilho não deixa — e não deve sobrar nenhum).
DELETE FROM public.matricula_salas s
 WHERE s.ano = 2027 AND s.sala > 8
   AND NOT EXISTS (SELECT 1 FROM public.matriculas m WHERE m.ano = s.ano AND m.sala = s.sala);
