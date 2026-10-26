import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/server-auth";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

type Reference = { name: string; type: string; dataUrl: string };
type CreativeMode = "image" | "video";

// Criado na primeira chamada, não no import: o SDK recusa construir sem chave, e
// o `next build` importa a rota para coletar dados — sem a variável no ambiente
// de build, o deploy inteiro quebrava.
let cliente: OpenAI | null = null;
function openai(): OpenAI {
  cliente ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return cliente;
}

// Cada pedido chama até três modelos pagos (gpt-4o-mini, gpt-image-1, sora-2)
// com a chave do servidor. Teto por pessoa contra clique repetido ou script.
// Fica na memória da instância: não é global, só tira o grosso do abuso — quem
// barra de verdade é o login de equipe no POST.
const CRIACOES_POR_HORA = 10;
const criacoesRecentes = new Map<string, number[]>();

function passouDoLimite(userId: string): boolean {
  const desde = Date.now() - 3_600_000;
  const recentes = (criacoesRecentes.get(userId) ?? []).filter((t) => t > desde);
  if (recentes.length >= CRIACOES_POR_HORA) {
    criacoesRecentes.set(userId, recentes);
    return true;
  }
  recentes.push(Date.now());
  criacoesRecentes.set(userId, recentes);
  return false;
}

function cleanReferences(value: unknown): Reference[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Reference => {
      if (!item || typeof item !== "object") return false;
      const ref = item as Partial<Reference>;
      return typeof ref.dataUrl === "string" && ref.dataUrl.startsWith("data:image/") && ref.dataUrl.length <= 8_000_000;
    })
    .slice(0, 4);
}

function parseAssistantJson(raw: string) {
  try {
    return JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "").trim());
  } catch {
    return {
      needsClarification: true,
      questions: ["Que resultado você quer criar e onde ele será usado?"],
      response: raw,
      prompt: "",
    };
  }
}

export async function POST(request: Request) {
  try {
    // Só equipe (professor, admin, staff): a rota gasta crédito pago da OpenAI.
    const user = await requireTeacherOrAdmin();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    if (passouDoLimite(user.id)) {
      return NextResponse.json(
        { error: `Limite de ${CRIACOES_POR_HORA} criações por hora atingido. Tente mais tarde.` },
        { status: 429 },
      );
    }

    const body = await request.json();
    const mode: CreativeMode = body.mode === "video" ? "video" : "image";
    const prompt = String(body.prompt ?? "").trim();
    const references = cleanReferences(body.references);

    if (!prompt) {
      return NextResponse.json({ error: "Descreva o que você quer criar." }, { status: 400 });
    }

    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      {
        type: "text",
        text: `Pedido do usuário: ${prompt}\n\nModo de criação: ${mode}\n\nReferências anexadas: ${references.length}`,
      },
      ...references.map((reference) => ({
        type: "image_url" as const,
        image_url: { url: reference.dataUrl, detail: "high" as const },
      })),
    ];

    const analysis = await openai().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Você é a diretora criativa da Compromisso. Analise pedidos de criação de ${mode === "image" ? "imagem" : "vídeo"} e suas referências.

Antes de gerar, faça perguntas apenas quando faltar informação que realmente muda o resultado: assunto principal, público, proporção/formato, texto obrigatório, estilo, duração ou movimento. Faça no máximo 3 perguntas objetivas. Se já houver contexto suficiente, não pergunte mais.

Responda SOMENTE JSON válido neste formato: {"needsClarification": boolean, "questions": string[], "response": string, "prompt": string}.
response deve ser uma mensagem curta em português do Brasil, explicando o que entendeu. prompt deve ser um prompt visual detalhado em inglês, vazio quando needsClarification for true. Não invente texto legível para aparecer na arte; peça confirmação se houver texto importante.`,
        },
        { role: "user", content },
      ],
      max_tokens: 900,
    });

    const result = parseAssistantJson(analysis.choices[0]?.message?.content ?? "");
    if (result.needsClarification || !result.prompt) {
      return NextResponse.json({
        success: true,
        needsClarification: true,
        questions: Array.isArray(result.questions) ? result.questions.slice(0, 3) : [],
        response: result.response || "Preciso de mais alguns detalhes para acertar o resultado.",
      });
    }

    if (mode === "image") {
      const generated = await openai().images.generate({
        model: "gpt-image-1",
        prompt: result.prompt,
        size: "1024x1024",
        quality: "medium",
      });
      const imageData = generated.data?.[0]?.b64_json;
      return NextResponse.json({
        success: true,
        needsClarification: false,
        response: result.response || "Imagem criada com base no seu briefing.",
        prompt: result.prompt,
        media: imageData ? { type: "image", url: `data:image/png;base64,${imageData}` } : null,
      });
    }

    const video = await openai().videos.create({
      model: "sora-2",
      prompt: result.prompt,
      seconds: "8",
      size: "1280x720",
      ...(references[0] ? { input_reference: { image_url: references[0].dataUrl } } : {}),
    });

    return NextResponse.json({
      success: true,
      needsClarification: false,
      response: result.response || "Seu vídeo entrou na fila de criação.",
      prompt: result.prompt,
      video: { id: video.id, status: video.status, progress: video.progress },
    });
  } catch (error) {
    console.error("[creative-assistant]", error);
    return NextResponse.json(
      { error: "Não consegui processar essa criação agora. Tente novamente em alguns instantes." },
      { status: 500 },
    );
  }
}
