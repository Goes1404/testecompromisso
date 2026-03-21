import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export const maxDuration = 20;

const themeSchema = z.object({
  title: z.string().describe("Um tema de redação padrão ENEM longo e desafiador. Ex: 'Os impactos do negacionismo científico na saúde pública do Brasil'"),
  supporting_texts: z.array(
    z.object({
      id: z.number(),
      content: z.string().describe("Um parágrafo de 3 a 4 linhas sendo uma citação de IBGE, artigo de jornal etc."),
      source: z.string().describe("Fonte do dado.")
    })
  ).min(2).max(4).describe("Três ou quatro textos fortemente motivadores e informativos como os impressos na prova do ENEM.")
});

export async function POST() {
  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: themeSchema,
      system: `Você é a bancada invisível do INEP e deve criar os Temas de Redação de surpresa para o simulado oficial. 
Gere temas polêmicos, complexos e estritamente atrelados a realidades do Brasil (tecnologia, meio ambiente, saúde mental, infraestrutura urbana, minorias).
Crie fragmentos de textos motivadores críveis baseados em sua base de dados (você pode simular estatísticas do IBGE ou citações de filósofos que caem muito, como Bauman ou Foucault).
Seja criativo. O aluno nunca deve ver o mesmo tema duas vezes.`,
      prompt: "Por favor, invente um tema fresco de redação do ENEM e construa os textos motivadores para mim agora.",
      temperature: 0.9,
    });

    return Response.json({ success: true, result: object });
  } catch (error) {
    console.error("Erro no Gerador de Tema:", error);
    return Response.json({ success: false, error: "Gerador INEP offline." }, { status: 500 });
  }
}
