'use server';

/**
 * @fileOverview Aurora - Avaliador de Redação Profissional.
 * Analisa o texto seguindo rigorosamente as 5 competências do ENEM.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const CorrectionSchema = z.object({
  original: z.string().describe('O trecho com erro encontrado no texto.'),
  suggestion: z.string().describe('A forma correta sugerida pela Aurora.'),
  reason: z.string().describe('Explicação da regra gramatical ou de coesão.')
});

const CompetencySchema = z.object({
  score: z.number().describe('Pontuação de 0 a 200.'),
  feedback: z.string().describe('Análise detalhada da competência.'),
});

const EssayEvaluatorInputSchema = z.object({
  theme: z.string().describe('O tema da redação.'),
  text: z.string().describe('O texto escrito pelo aluno.'),
});

const EssayEvaluatorOutputSchema = z.object({
  total_score: z.number().describe('Nota final de 0 a 1000.'),
  competencies: z.object({
    c1: CompetencySchema.describe('Domínio da norma culta.'),
    c2: CompetencySchema.describe('Compreender a proposta e aplicar conceitos.'),
    c3: CompetencySchema.describe('Selecionar, relacionar e organizar informações.'),
    c4: CompetencySchema.describe('Conhecimento dos mecanismos linguísticos.'),
    c5: CompetencySchema.describe('Proposta de intervenção.'),
  }),
  detailed_corrections: z.array(CorrectionSchema).describe('Lista de erros para destaque visual.'),
  general_feedback: z.string().describe('Visão geral pedagógica do texto.'),
  suggestions: z.array(z.string()).describe('Lista de ações para melhorar na próxima vez.'),
});

const prompt = ai.definePrompt({
  name: 'essayEvaluatorPrompt',
  model: googleAI.model('gemini-2.5-flash'),
  input: { schema: EssayEvaluatorInputSchema },
  output: { schema: EssayEvaluatorOutputSchema },
  config: { temperature: 0.3 },
  system: `Você é a Aurora, corretora sênior nota 1000 padrão INEP. 
  Sua análise deve ser rigorosa, técnica e construtiva.
  
  DIRETRIZES:
  1. Atribua notas APENAS em múltiplos de 40 (0, 40, 80, 120, 160, 200).
  2. Identifique pelo menos 3 trechos para "detailed_corrections", mesmo em textos bons, focando em refinamento vocabular ou coesão.
  3. Seja extremamente criteriosa com a Competência 1 (Gramática).
  4. Na Competência 5, verifique se há Agente, Ação, Meio/Modo, Efeito e Detalhamento.`,
  prompt: `Analise a seguinte redação:
  
  TEMA: {{{theme}}}
  TEXTO:
  {{{text}}}`,
});

export const essayEvaluatorFlow = ai.defineFlow(
  {
    name: 'essayEvaluator',
    inputSchema: EssayEvaluatorInputSchema,
    outputSchema: EssayEvaluatorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("A Aurora não conseguiu processar este texto.");
    return output;
  }
);
