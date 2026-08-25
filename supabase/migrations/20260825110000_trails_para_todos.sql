-- Alunos ETEC (63% da base) não viam nenhuma trilha exclusiva: 16 trilhas eram
-- 'enem' e zero eram 'etec'. Decisão de produto de 25/08: abrir as trilhas
-- existentes para todos em vez de duplicar conteúdo por público. O filtro do
-- app (dashboard/trails) já exibe target_audience = 'all' para qualquer aluno.
UPDATE trails SET target_audience = 'all' WHERE target_audience = 'enem';
