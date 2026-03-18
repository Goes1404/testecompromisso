'use server';

/**
 * @fileOverview Aurora - Assistente Pedagógica do Compromisso.
 * Atualizado para Gemini 2.0 Flash (Alta Performance).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']).describe('Papel.'),
  content: z.string().describe('Conteúdo.'),
});

const ConceptExplanationAssistantInputSchema = z.object({
  query: z.string(),
  history: z.array(MessageSchema).optional(),
  context: z.string().optional(),
});
export type ConceptExplanationAssistantInput = z.infer<typeof ConceptExplanationAssistantInputSchema>;

const ConceptExplanationAssistantOutputSchema = z.object({
  response: z.string(),
});
export type ConceptExplanationAssistantOutput = z.infer<typeof ConceptExplanationAssistantOutputSchema>;

const prompt = ai.definePrompt({
  name: 'conceptExplanationAssistantPrompt',
  model: 'googleai/gemini-2.0-flash',
  input: { schema: ConceptExplanationAssistantInputSchema },
  output: { schema: ConceptExplanationAssistantOutputSchema },
  config: { 
    temperature: 0.7,
    safetySettings: [
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' }
    ]
  },
  system: `Você é a Aurora, a assistente pedagógica do curso Compromisso em Santana de Parnaíba.
Sua missão é ajudar estudantes com dúvidas para o ENEM, ETEC e vestibulares.

REGRAS:
- Use Português Brasileiro profissional e empático.
- Responda APENAS com o texto da explicação.
- NUNCA use blocos de código Markdown (\` \` \`json ou \` \` \`text).`,
  prompt: `Pergunta: {{{query}}}
{{#if context}}Contexto: {{{context}}}{{/if}}
{{#if history}}Histórico de Conversa:
{{#each history}}{{{role}}}: {{{content}}}
{{/each}}{{/if}}`,
});

export const conceptExplanationAssistantFlow = ai.defineFlow(
  {
    name: 'conceptExplanationAssistant',
    inputSchema: ConceptExplanationAssistantInputSchema,
    outputSchema: ConceptExplanationAssistantOutputSchema,
  },
  async (input) => {
    try {
      const response = await prompt(input);
      
      const rawText = response.output?.response || response.text;
      
      if (!rawText) {
        throw new Error("A Aurora não conseguiu gerar uma resposta. Verifique os filtros de segurança ou sua chave de API.");
      }

      return { response: cleanAiResponse(rawText) };

    } catch (error: any) {
      console.error("[AURORA FLOW ERROR]:", error);
      throw error;
    }
  }
);

/**
 * Limpeza agressiva de artefatos de IA.
 */
function cleanAiResponse(text: string): string {
  return text
    .replace(/```json/g, '')
    .replace(/```text/g, '')
    .replace(/```/g, '')
    .replace(/\{"response":/g, '')
    .replace(/\}/g, '')
    .trim()
    .replace(/^"+|"+$/g, '');
}

export async function conceptExplanationAssistant(input: ConceptExplanationAssistantInput): Promise<ConceptExplanationAssistantOutput> {
  return conceptExplanationAssistantFlow(input);
}
