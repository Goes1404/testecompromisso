import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * 🔒 MOTOR DE INTELIGÊNCIA AURORA IA - COMPROMISSO 360
 * Configuração Industrial para Next.js 15 e Google Gemini.
 * 
 * Sintonizado para suporte total no Netlify e ambientes Serverless.
 */

// Chave fornecida para ambiente de teste (fallback de sinal)
const TEST_KEY = '''AIzaSyBFeIreOaaCnGn2lD6Cz7SacnTpbEhSRQg''';
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || TEST_KEY;

if (!apiKey) {
  console.error("❌ [CRÍTICO] Nenhuma chave de API detectada no ambiente!");
}

// Modelo de alta performance (1.5 Flash) - Otimizado para velocidade e custo-benefício
export const AURORA_MODEL = 'gemini-1.5-flash';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    }),
  ],
});
