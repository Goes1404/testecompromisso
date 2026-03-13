'use server';

/**
 * @fileOverview Aurora - Extrator de Provas em Massa.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QuestionSchema = z.object({
  question_text: z.string().describe('O enunciado completo da questão.'),
  options: z.array(z.object({
    key: z.string().describe('A letra da opção (A, B, C, D ou E).'),
    text: z.string().describe('O texto da alternativa.'),
  })).length(5).describe('As 5 alternativas da questão.'),
  correct_answer: z.string().describe('A letra da alternativa correta.'),
  year: z.number().describe('O ano da questão (se não encontrar, use 2024).'),
});

const BulkQuestionParserInputSchema = z.object({
  rawText: z.string().describe('O texto bruto copiado de uma prova ou PDF.'),
});
export type BulkQuestionParserInput = z.infer<typeof BulkQuestionParserInputSchema>;

const BulkQuestionParserOutputSchema = z.object({
  questions: z.array(QuestionSchema),
});
export type BulkQuestionParserOutput = z.infer<typeof BulkQuestionParserOutputSchema>;

const prompt = ai.definePrompt({
  name: 'bulkQuestionParserPrompt',
  model: 'gemini-1.5-flash',
  input: { schema: BulkQuestionParserInputSchema },
  output: { schema: BulkQuestionParserOutputSchema },
  config: { temperature: 0.2 },
  system: `Você é um assistente de digitalização pedagógica. 
  Sua missão é ler textos brutos de provas e extrair TODAS as questões de múltipla escolha.`,
  prompt: `Analise o seguinte conteúdo e extraia as questões:
  
  {{{rawText}}}`,
});

export const bulkQuestionParserFlow = ai.defineFlow(
  {
    name: 'bulkQuestionParser',
    inputSchema: BulkQuestionParserInputSchema,
    outputSchema: BulkQuestionParserOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("A IA falhou ao processar o texto da prova.");
    return output;
  }
);
