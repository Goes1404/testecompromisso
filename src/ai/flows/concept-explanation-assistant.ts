'use server';

/**
 * @fileOverview Aurora - Assistente Pedagógica do Compromisso.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const searchEducationalContent = ai.defineTool(
  {
    name: 'searchEducationalContent',
    description: 'Busca temas educacionais e questões de exemplo para ilustrar o aprendizado.',
    inputSchema: z.object({
      topic: z.string().describe('O tema da busca (ex: "segunda lei de newton").'),
    }),
    outputSchema: z.array(z.object({
      title: z.string(),
      description: z.string(),
    })),
  },
  async (input) => {
    return [
      { title: `Conceito de ${input.topic}`, description: `O estudo de ${input.topic} é fundamental para o ENEM.` },
      { title: `Questão Clássica`, description: `Como ${input.topic} se aplica no cotidiano?` }
    ];
  }
);

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
  model: googleAI.model('gemini-2.5-flash'),
  tools: [searchEducationalContent],
  input: { schema: ConceptExplanationAssistantInputSchema },
  output: { schema: ConceptExplanationAssistantOutputSchema },
  config: { temperature: 1.0 },
  system: `Você é a Aurora, a assistente pedagógica do curso Compromisso.
Sua missão é ajudar estudantes brasileiros com dúvidas para o ENEM e vestibulares.

REGRAS:
- Use Português Brasileiro profissional e empático.
- SEMPRE retorne sua resposta no campo "response" do JSON.
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
      const { output } = await prompt(input);
      if (!output) throw new Error("A IA retornou um resultado nulo.");
      return output;
    } catch (error: any) {
      console.error("ERRO CRÍTICO AURORA IA:", error?.message || error);
      if (error?.message?.includes("API key")) {
        return { response: "Ops! Minha chave de acesso parece estar com problemas. Por favor, verifique a GEMINI_API_KEY no ambiente." };
      }
      return { response: `Olá! Notei uma pequena instabilidade técnica (${error?.message?.substring(0, 40)}...). Pode repetir sua dúvida?` };
    }
  }
);

export async function conceptExplanationAssistant(input: ConceptExplanationAssistantInput): Promise<ConceptExplanationAssistantOutput> {
  return conceptExplanationAssistantFlow(input);
}
