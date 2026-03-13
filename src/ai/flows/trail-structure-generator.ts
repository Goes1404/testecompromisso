'use server';

/**
 * @fileOverview Aurora - Arquiteta de Trilhas.
 * Projeta a estrutura completa de uma jornada de aprendizagem.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ModuleStructureSchema = z.object({
  title: z.string().describe('Título curto e impactante do capítulo.'),
  description: z.string().describe('O que o aluno aprenderá neste módulo.'),
});

const TrailStructureInputSchema = z.object({
  topic: z.string().describe('O tema central da trilha (ex: Termodinâmica).'),
  targetAudience: z.string().optional().describe('Para quem é a trilha (ex: Alunos ETEC).'),
});
export type TrailStructureInput = z.infer<typeof TrailStructureInputSchema>;

const TrailStructureOutputSchema = z.object({
  title: z.string().describe('Título mestre da trilha.'),
  category: z.string().describe('Categoria acadêmica (Matemática, Física, etc).'),
  description: z.string().describe('Resumo estratégico da jornada.'),
  modules: z.array(ModuleStructureSchema).min(3).max(6).describe('Sequência de 3 a 6 capítulos didáticos.'),
});
export type TrailStructureOutput = z.infer<typeof TrailStructureOutputSchema>;

const prompt = ai.definePrompt({
  name: 'trailStructureGeneratorPrompt',
  model: 'gemini-1.5-flash',
  input: { schema: TrailStructureInputSchema },
  output: { schema: TrailStructureOutputSchema },
  config: { temperature: 0.7 },
  system: `Você é a Aurora, arquiteta pedagógica sênior. 
  Sua missão é desenhar ementas de trilhas de estudo de alto impacto.
  
  REGRAS:
  1. Divida o tema em uma sequência lógica de 3 a 6 capítulos.
  2. O tom deve ser motivador, técnico e profissional.
  3. Garanta que a ementa cubra do básico ao avançado dentro do tema.
  4. Use Português Brasileiro formal.`,
  prompt: `Projete uma trilha completa sobre: {{{topic}}}
  {{#if targetAudience}}Foco do público: {{{targetAudience}}}{{/if}}`,
});

export const trailStructureGeneratorFlow = ai.defineFlow(
  {
    name: 'trailStructureGenerator',
    inputSchema: TrailStructureInputSchema,
    outputSchema: TrailStructureOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error("A Aurora falhou ao projetar a ementa.");
    return output;
  }
);
