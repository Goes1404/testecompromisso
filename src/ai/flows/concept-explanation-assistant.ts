'use server';

/**
 * @fileOverview Aurora - Assistente Pedagógica do Compromisso.
 * Compatível com Gemini 1.5 Pro/Flash e 2.0 Flash.
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
  // Utiliza identificador flexível para compatibilidade com 1.5 e 2.0
  model: 'googleai/gemini-1.5-flash',
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
Sua missão é ajudar estudantes brasileiros com dúvidas para o ENEM, ETEC e vestibulares.

REGRAS:
- Use Português Brasileiro profissional e empático.
- Seja direto e focado no conteúdo acadêmico.
- Responda APENAS com o texto da explicação, sem formatação Markdown de blocos de código.`,
  prompt: `Pergunta: {{{query}}}
{{#if context}}Contexto: {{{context}}}{{/if}}
{{#if history}}Histórico:
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
      
      if (response.output?.response) {
        return { response: cleanAiResponse(response.output.response) };
      }
      
      if (response.text) {
        return { response: cleanAiResponse(response.text) };
      }

      throw new Error("A Engine Aurora retornou um sinal vazio. Verifique sua cota de API.");

    } catch (error: any) {
      console.error("[AURORA FLOW ERROR]:", error);
      throw error; // Repassa para o gateway tratar
    }
  }
);

/**
 * Limpa artefatos de Markdown e JSON que a IA possa gerar por engano.
 */
function cleanAiResponse(text: string): string {
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .replace(/\{"response":/g, '')
    .replace(/\}$/g, '')
    .trim()
    .replace(/^"+|"+$/g, ''); // Remove aspas extras no início/fim
}

export async function conceptExplanationAssistant(input: ConceptExplanationAssistantInput): Promise<ConceptExplanationAssistantOutput> {
  return conceptExplanationAssistantFlow(input);
}
