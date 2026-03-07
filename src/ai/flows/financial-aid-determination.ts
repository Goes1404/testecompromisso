'use server';

/**
 * @fileOverview Aurora - Consultora de Auxílio Financeiro.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FinancialAidDeterminationInputSchema = z.object({
  totalMonthlyIncome: z.number().describe("A renda bruta mensal total da família em Reais (BRL)."),
  familySize: z.number().describe('O número total de pessoas que residem na mesma casa.'),
});
export type FinancialAidDeterminationInput = z.infer<typeof FinancialAidDeterminationInputSchema>;

const FinancialAidDeterminationOutputSchema = z.object({
  eligibleForExemption: z
    .boolean()
    .describe('Se o aluno é elegível para isenção total baseada na renda per capita.'),
  explanation: z
    .string()
    .describe('Explicação clara do cálculo.'),
  perCapitaIncome: z.number().describe('O valor calculado da renda mensal por pessoa.'),
});
export type FinancialAidDeterminationOutput = z.infer<typeof FinancialAidDeterminationOutputSchema>;

export async function financialAidDetermination(
  input: FinancialAidDeterminationInput
): Promise<FinancialAidDeterminationOutput> {
  return financialAidDeterminationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialAidDeterminationPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: FinancialAidDeterminationInputSchema },
  output: { schema: FinancialAidDeterminationOutputSchema },
  system: `Você é a Aurora, uma consultora especialista em auxílio estudantil do curso Compromisso. 
  
  SUA TAREFA:
  1. Calcule a Renda Per Capita Mensal: Renda Total / número de moradores.
  2. Base de Salário Mínimo: R$ 1.621,00.
  3. Teto de Isenção (1,5 SM): R$ 2.431,50.
  4. Explique o resultado de forma empática em Português Brasileiro.
  5. SEMPRE responda no formato JSON solicitado.`,
  prompt: `DADOS RECEBIDOS:
  Renda Bruta Mensal Familiar: R$ {{{totalMonthlyIncome}}}
  Total de Residentes: {{{familySize}}}`,
});

export const financialAidDeterminationFlow = ai.defineFlow(
  {
    name: 'financialAidDeterminationFlow',
    inputSchema: FinancialAidDeterminationInputSchema,
    outputSchema: FinancialAidDeterminationOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
