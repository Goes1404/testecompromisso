'use server';

/**
 * @fileOverview Gerador de Quizzes via IA para Professores.
 */

import { ai } from '../genkit';
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
  Sua tarefa é criar um mini-quiz de 3 questões de múltipla escolha para o sistema Compromisso.`,
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
