import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

// 300s no Pro / 60s no Hobby — a Vercel usa o máximo permitido pelo plano
export const maxDuration = 300;
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
Sua missão: ajudar o aluno a ser aprovado no ENEM e nas ETECs.

- Responda sempre em texto corrido, claro e didático, em português do Brasil — NUNCA em JSON ou blocos de código, a menos que o aluno peça explicitamente um trecho de código.
- Seja direta e objetiva, mas acolhedora. Use exemplos práticos quando explicar conceitos.
- Se a pergunta for sobre um tópico de prova (matemática, redação, ciências, etc.), explique passo a passo.
- Se não tiver certeza de uma informação administrativa (documentação, isenção de taxa, prazos), avise o aluno para confirmar com a secretaria.`,
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