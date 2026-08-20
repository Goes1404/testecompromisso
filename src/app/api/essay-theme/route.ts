import { NextResponse } from "next/server";
import { respostaFalhaIA } from "@/lib/ia-status";
import { OpenAI } from "openai";
import { getBanca } from "@/lib/bancas";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    // O corpo é opcional: a tela do aluno só passou a mandar banca junto com o
    // modo FUVEST, e chamadas antigas sem corpo continuam gerando tema de ENEM.
    const body = await req.json().catch(() => ({}));
    const banca = getBanca(body?.banca);

    // Uma proposta de FUVEST não é uma proposta de ENEM com outro rótulo: o
    // recorte é conceitual em vez de problema social a resolver, e o comando
    // pede tese, não intervenção. Gerar no molde do ENEM e apenas renomear
    // devolveria ao aluno um treino da prova errada.
    const instrucao = banca.exigeIntervencao
      ? `Você é uma IA geradora de propostas de redação no modelo ENEM.
Gere um tema de impacto e atualidade no Brasil.`
      : `Você é uma IA geradora de propostas de redação no modelo FUVEST.
Gere um recorte CONCEITUAL, que permita tese filosófica e reflexão crítica — uma tensão a ser pensada, não um problema social a ser resolvido. Formule o tema de preferência como pergunta ou como par em tensão. NÃO peça proposta de intervenção nem solução prática. Os textos motivadores devem ser de origens variadas (filosofia, literatura, sociologia, canção).`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `${instrucao}
Seu JSON deve conter:
{
  "title": "${banca.exigeIntervencao
    ? 'O desafio de reduzir o desperdício de alimentos no Brasil contemporâneo'
    : 'Memória e esquecimento: o que uma sociedade escolhe guardar?'}",
  "supporting_texts": [
    { "id": 1, "content": "Texto de apoio...", "source": "Fonte" },
    { "id": 2, "content": "Outro texto de apoio...", "source": "Fonte" }
  ]
}`
        },
        {
          role: "user",
          content: "Gere o tema de redação."
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message?.content || "{}");

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    return respostaFalhaIA("essay-theme", error);
  }
}
