import { ai } from "@/ai/genkit";
import { z } from "zod";

/**
 * @fileOverview Fluxo de correção de redação unificado para Genkit 1.x.
 * Resolve o erro de inicialização ao remover dependências legadas inexistentes.
 */

const EssayAnalysisSchema = z.object({
  notaFinal: z.number().int().min(0).max(1000),
  feedbackGeral: z.string(),
  analiseCompetencias: z.object({
    "Competência 1": z.object({ nota: z.number().int(), analise: z.string() }),
    "Competência 2": z.object({ nota: z.number().int(), analise: z.string() }),
    "Competência 3": z.object({ nota: z.number().int(), analise: z.string() }),
    "Competência 4": z.object({ nota: z.number().int(), analise: z.string() }),
    "Competência 5": z.object({ nota: z.number().int(), analise: z.string() }),
  }),
});

const essayEvaluatorPrompt = ai.definePrompt({
  name: 'essayEvaluatorLegacyPrompt',
  input: { schema: z.object({ theme: z.string(), text: z.string() }) },
  output: { schema: EssayAnalysisSchema },
  prompt: `Você é um avaliador de redações especialista no modelo do ENEM.
Analise a redação sobre o tema "{{{theme}}}" seguindo as 5 competências do INEP.
Sua resposta deve ser um JSON puro.

TEXTO DA REDAÇÃO:
{{{text}}}`,
});

export const essayEvaluatorFlow = ai.defineFlow(
  {
    name: "essayEvaluatorFlowLegacy",
    inputSchema: z.object({ theme: z.string(), text: z.string() }),
    outputSchema: EssayAnalysisSchema,
  },
  async (input) => {
    const { output } = await essayEvaluatorPrompt(input);
    if (!output) throw new Error("A Aurora IA não conseguiu processar esta análise no momento.");
    return output;
  }
);

/**
 * Wrapper para compatibilidade com o endpoint legado.
 */
export async function gradeEssayFlow(theme: string, essayText: string) {
  return essayEvaluatorFlow({ theme, text: essayText });
}
