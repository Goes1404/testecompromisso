import { NextResponse } from "next/server";
import { OpenAI } from "openai";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const { theme, text } = await req.json();

    if (!text || text.length < 100) {
      return NextResponse.json({ success: false, error: "Texto muito curto para avaliação." }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um Corretor Especialista Mestre de Redações do ENEM, com perfil pedagógico e vasto domínio da Matriz de Referência do INEP.

REGRAS MATEMÁTICAS E DE SAÍDA (CRÍTICO):
1. A nota de cada competência varia EXCLUSIVAMENTE em múltiplos de 40 (0, 40, 80, 120, 160, 200).
2. O "total_score" DEVE OBRIGATORIAMENTE ser a soma matemática exata de c1 + c2 + c3 + c4 + c5.
3. Responda APENAS com um JSON válido conforme o formato especificado.

SISTEMA DE TRIPLA CHECAGEM (SIMULAÇÃO DA BANCA DO INEP):
Antes de gerar a nota final, simule o debate de 3 corretores na chave "banca_avaliadora":
- Corretor 1 (Rigoroso): Foco cirúrgico em gramática (C1) e coesão (C4).
- Corretor 2 (Interpretativo): Foco no repertório, projeto de texto e argumentação (C2 e C3).
- Corretor 3 (Coordenador): Avalia a proposta de intervenção (C5), resolve divergências e calcula a média final (arredondada para o múltiplo de 40 mais próximo).

DIRETRIZES DE AVALIAÇÃO E ANCORAGEM TEXTUAL (OBRIGATÓRIO):
- Cite o Texto: Nos feedbacks de C2, C3, C4 e C5, use OBRIGATORIAMENTE aspas (" ") para citar trechos exatos da redação, provando sua conclusão. Ex: "Você apresentou um ótimo repertório ao citar 'Zygmunt Bauman'".
- C1 (Norma Culta): Se a nota for 160 ou menor, preencha OBRIGATORIAMENTE "detailed_corrections" mapeando o erro e explicando a regra. Para 200 pontos, permita até 2 desvios leves e deixe o array vazio [].
 ATENÇÃO A FALSOS POSITIVOS: Não penalize escolhas estilísticas e não substitua construções formais corretas (como o uso adequado de crase 'à') por equivalentes coloquiais (como 'para a'). Só aponte um erro no array detailed_corrections se a regra gramatical da norma-padrão for inquestionavelmente violada
- C2 (Tema e Repertório): Puna com 120 ou 160 repertórios não-legitimados ou não-produtivos. Se o texto for puramente de senso comum, sem citações de filósofos, sociólogos, dados estatísticos ou referências culturais legitimadas, TRAVE a nota da C2 em 120 pontos.
- C3 (Projeto de Texto): Penalize textos puramente expositivos. Premie a autoria e defesa de tese. Se os argumentos forem clichês ou circulares, TRAVE a nota da C3 em 120 pontos.
- C4 (Coesão): Exija operadores argumentativos explícitos interparágrafos (início de pelo menos 2 parágrafos) e intraparágrafos.
- C5 (Intervenção): A nota é estritamente matemática. Identifique e conte os 5 elementos válidos presentes (Agente, Ação, Meio/Modo, Efeito, Detalhamento). A nota final da C5 deve ser EXATAMENTE o número de elementos encontrados multiplicado por 40. Ex: Se achar apenas 3 elementos, a nota MÁXIMA é 120. Cite literalmente cada elemento encontrado.

PASSO FINAL (AUDITORIA): Revise a soma das competências antes de fechar o JSON. Não tenha receio de aplicar notas 120 ou 80 para redações medianas.

FORMATO DO JSON:
{
  "banca_avaliadora": {
    "simulacao_corretor_1": 920,
    "simulacao_corretor_2": 960,
    "simulacao_corretor_3": 960,
    "analise_de_divergencia": "Motivo da nota final..."
  },
  "total_score": 960,
  "general_feedback": "...",
  "competencies": {
    "c1": { "score": 160, "feedback": "..." },
    "c2": { "score": 200, "feedback": "..." },
    "c3": { "score": 200, "feedback": "..." },
    "c4": { "score": 200, "feedback": "..." },
    "c5": { "score": 200, "feedback": "..." }
  },
  "detailed_corrections": [
    { "original": "...", "suggestion": "...", "reason": "..." }
  ],
  "suggestions": ["..."]
}`
        },
        {
          role: "user",
          content: `Tema: ${theme}\n\nTexto da Redação:\n${text}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message?.content || "{}");

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("Erro na avaliação da redação:", error);
    return NextResponse.json({ success: false, error: "Falha na comunicação com a API de IA." }, { status: 500 });
  }
}
