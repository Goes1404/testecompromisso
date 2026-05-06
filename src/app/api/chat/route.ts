import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

// Tempo máximo de processamento da Vercel (300s no Pro, 60s no Hobby)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      // Reduzimos a temperatura para 0.2. Isso tira a "criatividade" excessiva e 
      // foca na precisão e lógica, evitando que ela invente dados (alucinação).
      temperature: 0.2,
      system: `Você é a Aurora, a mentora de inteligência artificial oficial do cursinho Compromisso.
Sua missão: Aprovar o aluno no ENEM e nas ETECs.

Ao extrair dados em JSON:
- Seja extremamente rigoroso com o formato.
- NÃO inclua texto explicativo fora do bloco JSON.
- Certifique-se de que o JSON esteja completo e bem-formado.
- Se o texto estiver truncado ou confuso, tente extrair o máximo possível de questões válidas.`,
      messages,
      maxOutputTokens: 16000,
    });

    // Retorna a resposta empacotada em JSON fechado para o frontend antigo
    return Response.json({ success: true, result: { response: text } });

  } catch (error) {
    console.error("Erro na API da Aurora:", error);
    return new Response(
      JSON.stringify({ error: "Erro na comunicação com o cérebro da Aurora OpenAI." }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}