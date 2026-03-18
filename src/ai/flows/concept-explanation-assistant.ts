'use server';

/**
 * @fileOverview Aurora - Assistente Pedagógica do Compromisso.
 * Implementação ultra-resiliente com tratamento de erros verboso e filtros de segurança acadêmicos.
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
- NÃO use blocos de código Markdown (como \`\`\`json) na sua resposta final. Retorne apenas o objeto puro.
- Se o usuário perguntar algo não acadêmico, direcione-o gentilmente de volta aos estudos.`,
  prompt: `Pergunta: {{{query}}}
{{#if context}}Contexto: {{{context}}}{{/if}}
{{#if history}}Histórico:
{{#each history}}{{{role}}}: {{{content}}}
{{/each}}{{if}}`,
});

export const conceptExplanationAssistantFlow = ai.defineFlow(
  {
    name: 'conceptExplanationAssistant',
    inputSchema: ConceptExplanationAssistantInputSchema,
    outputSchema: ConceptExplanationAssistantOutputSchema,
  },
  async (input) => {
    try {
      console.log("[AURORA FLOW START]: Processando query:", input.query);
      const response = await prompt(input);
      
      if (response.output) {
        return response.output;
      }
      
      if (response.text) {
        // Limpeza agressiva de Markdown para evitar erros de parse
        const cleanedText = response.text
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
          
        try {
          const parsed = JSON.parse(cleanedText);
          if (parsed.response) return { response: parsed.response };
        } catch (e) {
          return { response: response.text };
        }
      }

      return { response: "A Aurora está sintonizando uma resposta... tente novamente." };

    } catch (error: any) {
      console.error("[AURORA FLOW ERROR]:", error);
      throw new Error(`Falha na engine de resposta: ${error.message}`);
    }
  }
);

export async function conceptExplanationAssistant(input: ConceptExplanationAssistantInput): Promise<ConceptExplanationAssistantOutput> {
  return conceptExplanationAssistantFlow(input);
}
