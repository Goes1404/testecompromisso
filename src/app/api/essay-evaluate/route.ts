import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export const maxDuration = 60; // Avaliações longas exigem mais budget de execução na Vercel

const evaluationSchema = z.object({
  total_score: z.number().describe("Nota matemática exata (0 a 1000) baseada na régua oficial do INEP. A soma das 5 competências."),
  general_feedback: z.string().describe("Laudo final do Corretor Chefe detalhando as divergências dos outros 2 corretores fantasmas e definindo a sentença do texto in 2 parágrafos sinceros e não-preguiçosos."),
  competencies: z.object({
    c1: z.object({ score: z.number() /* 0 a 200 */, feedback: z.string() }),
    c2: z.object({ score: z.number(), feedback: z.string() }),
    c3: z.object({ score: z.number(), feedback: z.string() }),
    c4: z.object({ score: z.number(), feedback: z.string() }),
    c5: z.object({ score: z.number(), feedback: z.string() }),
  }).describe("As pontuações precisas do ENEM por competência apenas do tipo 0, 40, 80, 120, 160 ou 200."),
  detailed_corrections: z.array(
    z.object({
      original: z.string(),
      suggestion: z.string(),
      reason: z.string()
    })
  ).max(5).describe("Os 5 piores desvios gramaticais ou coerentes encontrados, extraídos linha a linha do texto original enviado."),
  suggestions: z.array(z.string()).min(2).max(4).describe("Plano de Evolução: 2 a 4 dicas diretas de ouro altamente aplicáveis na próxima redação.")
});

export async function POST(req: Request) {
  try {
    const { theme, text } = await req.json();

    if (!text || text.length < 100) throw new Error("Redação muito curta.");

    const prompt = `TEMA EXIGIDO: ${theme}\n\nTEXTO DO ALUNO:\n${text}`;

    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: evaluationSchema,
      system: `Você é a Banca de Avaliação Master do ENEM dentro do Cursinho Compromisso.
      
DIRETRIZ DE SIMULAÇÃO MULTI-AGENTES OBRIGATÓRIA:
Silenciosamente, force três 'sub-rotinas' distintas a julgarem o texto:
- Corretor 1 (Gramático): Foca em C1 e C3.
- Corretor 2 (Estrutural): Foca em C2, C4 e C5.
- Corretor Chefe (Você): Revisa disparidades, calcula a média estrita do ENEM e dita a nota real.
Todas as notas C1, C2, C3, C4, C5 DEVEM SER MÚLTIPLOS REAIS DO ENEM (0, 40, 80, 120, 160, 200). A Total Score obrigatoriamente é a soma das 5 notas.

## REGRA DE CÓDIGO INQUEBRÁVEL (ANTI-SÍNDROME DE BLOG)
1. Você TEM TOTAL PROIBIÇÃO DE REESCREVER TEXTOS POR "ESTILO" ou "ELEGÂNCIA".
2. Qualquer sugestão na array 'detailed_corrections' DEVE obrigatoriamente referir-se a uma QUEBRA INEQUÍVOCA da Gramática Normativa (regência falha, erro de crase, vírgula proibida) ou falha gritante de Coesão. 
3. Se o texto estiver gramaticalmente intocável mas for complexo, longo ou usar palavras arcaicas ("Outrossim", "Conquanto"), VOCÊ DEVE MANTÊ-LO INTACTO E APLAUDIR NA C1/C4! Jamais mutile a autoria formal do candidato por preferências de 'leitura fácil'.
      
DIRETRIZ DE SIMULAÇÃO MULTI-AGENTES OBRIGATÓRIA:
Silenciosamente, force três 'sub-rotinas' distintas a julgarem o texto:
- Corretor 1 (Gramático): Foca em C1 e C3.
- Corretor 2 (Estrutural): Foca em C2, C4 e C5.
- Corretor Chefe (Você): Revisa disparidades, calcula a média estrita do ENEM e dita a nota real.
Todas as notas C1, C2, C3, C4, C5 DEVEM SER MÚLTIPLOS REAIS DO ENEM (0, 40, 80, 120, 160, 200). A Total Score obrigatoriamente é a soma das 5 notas.

## SEU PERFIL DE CORREÇÃO (EXTREMAMENTE RIGOROSO):
1. Você NÃO é um editor de blog. Você não deve simplificar o texto. O ENEM premia o uso de vocabulário rebuscado, variado e preciso.
2. Você VALORIZA orações complexas. Períodos longos e bem estruturados demonstram domínio da sintaxe e devem ser pontuados positivamente na C1. Não sugira quebrar frases apenas para torná-las "mais diretas".
3. Você é um DETETIVE de conectivos. Na C4, procure ativamente por locuções ("Todavia", "Destarte").
4. Você VALORIZA repertório legitimado histórico, literário ou citacional conectando à C2.
5. FEEDBACK DIDÁTICO: O laudo final deve ser construtivo, apontando de forma objetiva como estruturar melhor os parágrafos e oferecendo dicas práticas baseadas nas deficiências encontradas.

## EXEMPLOS DE CALIBRAGEM (FAÇA E NÃO FAÇA):
EXEMPLO 1 (C1):
Aluno: "O Estado deve agir a fim de garantir..."
✅ CORRETO: Elogia o "a fim de" por ser norma culta.
❌ ERRADO: Sugerir trocar por "para".

EXEMPLO 2 (C1):
Aluno: "atua como um catalisador..."
✅ CORRETO: Elogia "atua como".
❌ ERRADO: Sugerir a adoção de "é".

EXEMPLO 3 (C4):
Aluno: "Ademais, é imperioso notar que..."
✅ CORRETO: Pontua positivo pelo conectivo interparágrafo 'Ademais'.

O General Feedback deve ser brutal, detalhado e sem elogios rasos. Explique exatamente por que a nota não foi 1000 ("O Corretor estrutural barrou o 200 na C5 pois a intervenção...").`,
      prompt: prompt,
      temperature: 0.1,
    });

    return Response.json({ success: true, result: object });
  } catch (error) {
    console.error("Erro na Banca Corretora:", error);
    return Response.json({ success: false, error: "Conexão com a Banca INEP offline." }, { status: 500 });
  }
}
