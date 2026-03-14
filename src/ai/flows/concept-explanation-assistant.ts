
'use server';

/**
 * @fileOverview Aurora - Assistente Pedagógica do Compromisso.
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
    // Ativa o modo JSON nativo do Gemini para evitar falhas de validação
    responseMimeType: 'application/json' 
  },
  system: `Você é a Aurora, a assistente pedagógica do curso Compromisso em Santana de Parnaíba.
Sua missão é ajudar estudantes brasileiros com dúvidas para o ENEM, ETEC e vestibulares.

REGRAS:
- Use Português Brasileiro profissional e empático.
- Retorne sua resposta EXCLUSIVAMENTE no formato JSON: {"response": "sua resposta aqui"}.
- Se o usuário perguntar algo não acadêmico, direcione-o gentilmente de volta aos estudos.`,
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
    const response = await prompt(input);
    
    // Tenta obter o output estruturado (Zod)
    if (response.output) {
      return response.output;
    }
    
    // Fallback: Se o Zod falhar mas houver texto, tentamos retornar como response
    if (response.text) {
      return { response: response.text };
    }

    throw new Error("A Aurora não conseguiu sintonizar uma resposta válida no momento.");
  }
);

export async function conceptExplanationAssistant(input: ConceptExplanationAssistantInput): Promise<ConceptExplanationAssistantOutput> {
  return conceptExplanationAssistantFlow(input);
}
