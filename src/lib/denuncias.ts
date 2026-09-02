/**
 * "Questão incompleta" — o aviso do aluno.
 *
 * A régua de `questao-integridade.ts` pega o defeito que tem forma no texto.
 * O que ela não pega é a questão cujo texto de apoio existe mas é o errado, a
 * que perdeu a figura sem citar figura, a que veio com o gabarito trocado.
 * Quem vê isso é quem está tentando responder.
 *
 * Um clique, duas consequências, e a diferença entre elas é o desenho todo:
 *   - IMEDIATA e individual: a questão não volta a aparecer para ELE;
 *   - COLETIVA e represada: ao terceiro aviso independente sai para todos.
 *
 * A contagem e a desativação moram no servidor
 * (`avisar_questao_incompleta`, migration 20260902020000). Aqui não se conta
 * nada: um limite avaliado no cliente seria um limite que o cliente escolhe.
 *
 * ── Tolerância a banco sem a migration ──────────────────────────────────────
 * As duas funções engolem o erro de tabela/função inexistente e seguem. É a
 * lição de `mural_posts.avisado_em` e de `questions.ativa`: um recurso novo que
 * ainda não subiu no banco não pode derrubar o simulado inteiro com 400 — ele
 * some, e só.
 */

import { supabase } from '@/app/lib/supabase';
import { log } from '@/lib/logger';

/** Questões que ESTE aluno já marcou como incompletas. */
export async function questoesAvisadasPor(userId: string): Promise<Set<string>> {
  try {
    const { data, error } = await supabase
      .from('questao_denuncias')
      .select('question_id')
      .eq('student_id', userId);
    if (error) throw error;
    return new Set((data ?? []).map((d: { question_id: string }) => d.question_id));
  } catch (e) {
    // Sem a migration, ninguém avisou nada — conjunto vazio é a resposta certa.
    log.warn('denuncias.leitura_falhou', { motivo: e instanceof Error ? e.message : String(e) });
    return new Set();
  }
}

export interface ResultadoDoAviso {
  /** Total de avisos que a questão tem agora, deste aluno e dos outros. */
  avisos: number;
  /** A questão saiu do ar para todo mundo com este aviso (ou já estava fora). */
  desativada: boolean;
  /** O aviso chegou ao servidor. `false` = ficou só valendo nesta sessão. */
  gravado: boolean;
}

/**
 * Avisa que a questão está incompleta.
 *
 * O `student_id` NÃO vai no corpo: a função no servidor o tira de `auth.uid()`.
 * É a regra de IDOR do CLAUDE.md — id que o cliente manda é id que o cliente
 * escolhe, e aqui ele decidiria o voto de outra pessoa.
 */
export async function avisarQuestaoIncompleta(questionId: string): Promise<ResultadoDoAviso> {
  try {
    const { data, error } = await supabase
      .rpc('avisar_questao_incompleta', { p_question_id: questionId })
      .single();
    if (error) throw error;
    const r = data as { avisos: number; desativada: boolean };
    return { avisos: r?.avisos ?? 1, desativada: Boolean(r?.desativada), gravado: true };
  } catch (e) {
    log.warn('denuncias.aviso_nao_gravado', { motivo: e instanceof Error ? e.message : String(e) });
    // O aluno não paga pela falha: a questão sai da vez dele de qualquer jeito.
    // Só a memória entre sessões é que se perde.
    return { avisos: 0, desativada: false, gravado: false };
  }
}
