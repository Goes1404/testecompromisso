'use server';

/**
 * @fileOverview Aurora - Gerador de Temas de Redação Estilo ENEM.
 * Gera temas completos com textos motivadores utilizando Gemini 1.5 Flash.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EssayTopicInputSchema = z.object({
  category: z.string().optional().describe('Eixo temático opcional.'),
});

const EssayTopicOutputSchema = z.object({
  title: z.string().describe('O título do tema da redação.'),
  context: z.string().describe('Breve introdução ao problema.'),
  supporting_texts: z.array(z.object({
    id: z.number(),
    content: z.string().describe('Conteúdo do texto motivador.'),
    source: z.string().describe('Fonte do texto (ex: G1, Folha, IBGE).')
  })).describe('Lista de textos motivadores para o aluno se basear (mínimo 3).'),
});

const prompt = ai.definePrompt({
  name: 'essayTopicGeneratorPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: EssayTopicInputSchema },
  output: { schema: EssayTopicOutputSchema },
  system: `Você é a Aurora, mentora de redação nota 1000. 
  Sua missão é criar propostas de redação IDÊNTICAS às do ENEM.
  REGRAS:
  1. O tema deve ser um problema social brasileiro atual e relevante.
  2. Inclua EXATAMENTE 3 ou 4 textos motivadores curtos e impactantes.
  3. Os textos devem conter dados estatísticos fictícios mas verossímeis, citações ou reflexões sociológicas.
  4. O tom deve ser formal, sério e pedagógico.`,
  prompt: `Gere uma proposta de redação desafiadora{{#if category}} focada em {{{category}}}{{/if}}.`,
});

export const essayTopicGeneratorFlow = ai.defineFlow(
  {
    name: 'essayTopicGenerator',
    inputSchema: EssayTopicInputSchema,
    outputSchema: EssayTopicOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("A IA falhou ao gerar o tema completo.");
    return output;
  }
);
