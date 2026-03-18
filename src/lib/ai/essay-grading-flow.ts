
import { configure, flow } from "@genkit-ai/core";
import { googleAI } from "@genkit-ai/googleai";
import { z } from "zod";

// Configuração do Genkit para usar o Google AI (Gemini)
configure({
  plugins: [
    googleAI({ apiVersion: "v1beta" }), // Usando uma versão recente para acesso a mais features
  ],
  logLevel: "debug",
  enableTracing: true,
});

// Schema de validação para a estrutura da resposta da IA
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

// Definição do fluxo de IA com o prompt detalhado
export const essayEvaluatorFlow = flow(
  {
    name: "essayEvaluatorFlow",
    inputSchema: z.object({ theme: z.string(), text: z.string() }),
    outputSchema: EssayAnalysisSchema,
  },
  async ({ theme, text }) => {
    const prompt = `
      Você é um avaliador de redações especialista no modelo do ENEM (Exame Nacional do Ensino Médio) do Brasil.
      Sua tarefa é analisar uma redação com base em um tema proposto, seguindo rigorosamente as 5 competências do ENEM.

      TEMA DA REDAÇÃO: "${theme}"

      TEXTO DA REDAÇÃO:
      """
      ${text}
      """

      INSTRUÇÕES DE ANÁLISE:
      1.  **Avaliação Individual das Competências:** Avalie o texto em cada uma das 5 competências do ENEM, atribuindo uma nota de 0 a 200 para cada uma. A nota deve ser um múltiplo de 40 (0, 40, 80, 120, 160, 200).
      2.  **Justificativa Detalhada:** Para cada competência, escreva uma análise (com 2-3 frases) explicando a nota atribuída. Aponte pontos fortes e fracos, e se possível, cite trechos curtos do texto para embasar sua avaliação.
      3.  **Feedback Geral:** Escreva um parágrafo de feedback geral que resuma a performance do aluno, oferecendo um conselho principal para melhoria.
      4.  **Cálculo da Nota Final:** A nota final é a soma das notas das 5 competências.
      5.  **Formato de Saída:** Retorne sua análise estritamente no formato JSON, conforme o schema definido. Não inclua nenhum texto ou caractere antes ou depois do objeto JSON.

      COMPETÊNCIAS PARA ANÁLISE:
      - **Competência 1:** Demonstrar domínio da modalidade escrita formal da língua portuguesa.
      - **Competência 2:** Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento para desenvolver o tema, dentro dos limites estruturais do texto dissertativo-argumentativo em prosa.
      - **Competência 3:** Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos em defesa de um ponto de vista.
      - **Competência 4:** Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação.
      - **Competência 5:** Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos.
    `;

    const llmResponse = await googleAI().generate({
      model: "gemini-1.5-flash",
      prompt,
      output: { format: "json", schema: EssayAnalysisSchema },
      temperature: 0.7, // Um pouco de criatividade para análises mais ricas
    });

    return llmResponse.output();
  }
);

/**
 * Realiza a chamada para o fluxo Genkit de correção de redação.
 * @param theme - O tema da redação.
 * @param essayText - O texto da redação.
 * @returns Uma promessa que resolve para a análise estruturada da IA.
 */
export async function gradeEssayFlow(theme: string, essayText: string): Promise<z.infer<typeof EssayAnalysisSchema>> {
  try {
    // Invoca o fluxo Genkit real
    const analysis = await essayEvaluatorFlow.run({ input: { theme, text: essayText } });
    return analysis;
  } catch (error: any) {
    console.error("[gradeEssayFlow] Erro ao executar o fluxo Genkit:", error);
    // Propaga o erro para que a API de rota possa tratá-lo
    throw new Error("Falha na comunicação com o serviço de IA. Detalhes: " + error.message);
  }
}
