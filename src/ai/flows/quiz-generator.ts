'use server';

/**
 * @fileOverview Gerador de Quizzes via IA para Professores utilizando Gemini 1.5 Flash.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QuestionSchema = z.object({
  question: z.string().describe('O enunciado da pergunta.'),
  options: z.array(z.string()).length(4).describe('Quatro opções de resposta.'),
  correctIndex: z.number().min(0).max(3).describe('O índice da resposta correta (0-3).'),
  explanation: z.string().describe('Explicação pedagógica.'),
  sourceStyle: z.string().describe('Estilo de vestibular (ex: Estilo ENEM).'),
});

const QuizGeneratorInputSchema = z.object({
  topic: z.string().describe('O tópico ou título do módulo.'),
  description: z.string().optional().describe('Descrição adicional do conteúdo.'),
});
export type QuizGeneratorInput = z.infer<typeof QuizGeneratorInputSchema>;

const QuizGeneratorOutputSchema = z.object({
  questions: z.array(QuestionSchema).describe('Lista de questões.'),
});
export type QuizGeneratorOutput = z.infer<typeof QuizGeneratorOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: QuizGeneratorInputSchema },
  output: { schema: QuizGeneratorOutputSchema },
  config: { temperature: 0.8 },
  system: `Você é um professor especialista em exames de admissão brasileiro.
  Sua tarefa é criar um mini-quiz de 3 questões de múltipla escolha.
  
  REGRAS:
  1. ESTILO VESTIBULAR: Emule o padrão ENEM/FUVEST.
  2. DISTRATORES: Opções incorretas devem ser plausíveis.
  3. IDIOMA: Português Brasileiro.
  4. FORMATO: JSON estrito conforme o esquema fornecido.`,
  prompt: `Tema: {{{topic}}}
  Contexto: {{{description}}}`,
});

export const quizGeneratorFlow = ai.defineFlow(
  {
    name: 'quizGenerator',
    inputSchema: QuizGeneratorInputSchema,
    outputSchema: QuizGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("A IA falhou ao gerar o quiz.");
    return output;
  }
);

export async function generateQuiz(input: QuizGeneratorInput): Promise<QuizGeneratorOutput> {
  return quizGeneratorFlow(input);
}
