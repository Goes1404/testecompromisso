
'use server';

/**
 * @fileOverview Aurora - Assistente Pedagógica do Compromisso.
 * Implementação resiliente para evitar falhas de validação JSON.
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
  },
  system: `Você é a Aurora, a assistente pedagógica do curso Compromisso em Santana de Parnaíba.
Sua missão é ajudar estudantes brasileiros com dúvidas para o ENEM, ETEC e vestibulares.

REGRAS:
- Use Português Brasileiro profissional e empático.
- Seja direto e focado no conteúdo acadêmico.
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
    try {
      const response = await prompt(input);
      
      // 1. Tenta obter o output estruturado (Zod) - Modo Ideal
      if (response.output) {
        return response.output;
      }
      
      // 2. Se falhar, tenta extrair JSON do texto bruto (Remoção de Markdown)
      if (response.text) {
        const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
          const parsed = JSON.parse(cleanedText);
          if (parsed.response) return { response: parsed.response };
        } catch (e) {
          // Não é um JSON válido, retornamos o texto bruto como resposta
          return { response: response.text };
        }
      }

      // 3. Fallback final: tenta ler a mensagem diretamente
      const rawMsg = response.text || "A Aurora está sintonizando uma resposta... tente novamente.";
      return { response: rawMsg };

    } catch (error: any) {
      console.error("[AURORA FLOW ERROR]:", error);
      throw new Error(`Falha na engine de resposta: ${error.message}`);
    }
  }
);

export async function conceptExplanationAssistant(input: ConceptExplanationAssistantInput): Promise<ConceptExplanationAssistantOutput> {
  return conceptExplanationAssistantFlow(input);
}
