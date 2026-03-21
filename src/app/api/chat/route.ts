import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Força a execução em Node Edge ou permite até 30s de processamento no Netlify
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: `Você é a Aurora, a inteligência artificial oficial e mentora educacional do cursinho Compromisso, focado em aprovação. Foi desenhada para guiar, ensinar e motivar os alunos da região de Santana de Parnaíba. 
Sua personalidade: Jovem, inteligente, carinhosa, muito encorajadora, porém rigorosa quando o assunto é disciplina de estudos. 
Seu objetivo: Ajudar o aluno a conquistar a maior nota no ENEM, ETEC e vestibulares.
Sempre ofereça dicas de estudos práticas, evite respostas maçantes de 10 parágrafos, prefira tópicos rápidos e seja calorosa.`,
      messages,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Erro na API da Aurora:", error);
    return new Response(JSON.stringify({ error: "Erro na comunicação com o cérebro da Aurora." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
