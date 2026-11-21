import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { exigirAdmin } from "@/lib/server-auth";
import { respostaFalhaIA } from "@/lib/ia-status";
import { respostasDe } from "@/lib/correcao-gabarito";

/**
 * Lê a foto de um cartão-resposta do simulado (gabarito oficial ou cartão de
 * aluno) e devolve nome, nº de inscrição e a alternativa marcada em cada
 * questão. Só LÊ: quem corrige é `corrigir()` em `src/lib/correcao-gabarito.ts`.
 * Só admin/staff. A foto não é guardada em lugar nenhum (é de menor de idade):
 * entra, é lida e some.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const SISTEMA =
  "Você lê fotos de cartões-resposta (folhas de gabarito) de um simulado escolar brasileiro. " +
  "Responda SOMENTE com um objeto JSON, sem comentários. " +
  "Regras de leitura: cada questão é numerada; a alternativa marcada é a bolinha/quadrado preenchido, " +
  "riscado ou com X (letras A, B, C, D ou E). Questão sem nenhuma marcação = null. " +
  "Questão com duas ou mais alternativas marcadas = \"*\". Rasura apagada não conta como marcação. " +
  "Nunca invente: se não dá para ver uma questão, use null. " +
  "Formato: {\"nome\": string|null, \"inscricao\": string|null, \"total_questoes\": número, " +
  "\"respostas\": {\"1\": \"A\", \"2\": null, ...}, \"legivel\": true|false, \"observacao\": string|null}. " +
  "\"nome\" é o nome do aluno escrito à mão ou impresso no cartão, exatamente como está escrito. " +
  "\"inscricao\" é o número de inscrição, se houver (só os dígitos). " +
  "\"legivel\" é false se a foto estiver cortada, desfocada ou não for um cartão-resposta.";

export async function POST(req: Request) {
  const auth = await exigirAdmin();
  if (auth.negado) return auth.negado;

  let corpo: { image?: unknown; tipo?: unknown; total?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const { image } = corpo;
  const tipo = corpo.tipo === "gabarito" ? "gabarito" : "aluno";
  const total = typeof corpo.total === "number" && corpo.total > 0 && corpo.total <= 200 ? Math.floor(corpo.total) : undefined;

  if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) {
    return NextResponse.json({ error: "Envie uma foto (JPEG, PNG ou WEBP)." }, { status: 400 });
  }
  if (((image.split(",")[1] || "").length * 3) / 4 > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Foto muito grande (máximo 8 MB)." }, { status: 413 });
  }

  const pedido = tipo === "gabarito"
    ? "Esta é a folha do GABARITO OFICIAL (as respostas certas). Leia a alternativa correta de cada questão. Não há nome de aluno: use null em nome e inscricao."
    : "Este é o cartão-resposta de um ALUNO. Leia o nome do aluno, o número de inscrição (se houver) e a alternativa marcada em cada questão.";
  const tamanho = total ? ` A prova tem ${total} questões: devolva exatamente as questões de 1 a ${total}.` : "";

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 2500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SISTEMA },
        {
          role: "user",
          content: [
            { type: "text", text: pedido + tamanho },
            { type: "image_url", image_url: { url: image, detail: "high" } },
          ],
        },
      ],
    });
    let dados: Record<string, unknown> = {};
    try {
      dados = JSON.parse(r.choices[0]?.message?.content || "{}");
    } catch {
      return NextResponse.json({ error: "Não deu para ler este cartão. Tire outra foto, mais de perto e com luz." }, { status: 422 });
    }
    const n = total ?? (typeof dados.total_questoes === "number" ? dados.total_questoes : undefined);
    const respostas = respostasDe(dados.respostas, n && n > 0 && n <= 200 ? n : undefined);
    if (!respostas.length) {
      return NextResponse.json({ error: "Não achei questões nesta foto. Confira se é o cartão-resposta inteiro." }, { status: 422 });
    }
    const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : null);
    return NextResponse.json({
      nome: tipo === "gabarito" ? null : texto(dados.nome),
      inscricao: tipo === "gabarito" ? null : texto(dados.inscricao),
      respostas,
      legivel: dados.legivel !== false,
      observacao: texto(dados.observacao),
    });
  } catch (e) {
    return respostaFalhaIA("simulado-ler-cartao", e);
  }
}
