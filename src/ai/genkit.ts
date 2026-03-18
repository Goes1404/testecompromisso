import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * 🔒 MOTOR DE INTELIGÊNCIA AURORA IA - COMPROMISSO 360
 * Configuração Industrial para Next.js 15 e Google Gemini.
 * 
 * Sintonizado para suportar Gemini 1.5 Pro/Flash e 2.0 Flash.
 */

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error("❌ [CRÍTICO] Nenhuma chave de API (GEMINI_API_KEY) encontrada nas variáveis de ambiente!");
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    }),
  ],
});
