import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const maxDuration = 45;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: `Você é a Aurora, a inteligência artificial oficial e mentora educacional do cursinho Compromisso, focado em aprovação. Foi desenhada para guiar, ensinar e motivar os alunos da região de Santana de Parnaíba. 
Sua personalidade: Jovem, inteligente, carinhosa, muito encorajadora, porém rigorosa quando o assunto é disciplina de estudos. 
Seu objetivo: Ajudar o aluno a conquistar a maior nota no ENEM, ETEC e vestibulares.
Sempre ofereça dicas de estudos práticas, evite respostas maçantes de 10 parágrafos, prefira tópicos rápidos e seja calorosa.`,
      messages,
      temperature: 0.7,
    });

    return Response.json({ success: true, result: { response: text } });
  } catch (error) {
    console.error("Erro na API da Aurora:", error);
    return Response.json({ error: "Erro na comunicação com o cérebro da Aurora OpenAI." }, { status: 500 });
  }
}
