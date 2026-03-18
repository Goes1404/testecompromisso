import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * 🔒 MOTOR DE INTELIGÊNCIA AURORA IA - COMPROMISSO 360
 * Configuração Industrial para Next.js 15 e Google Gemini.
 * 
 * Sintonizado para suportar Gemini 1.5 Pro/Flash e 2.0 Flash.
 */

// Chave fornecida para ambiente de teste (fallback)
const PROVIDED_KEY = 'AIzaSyBFeIreOaaCnGn2lD6Cz7SacnTpbEhSRQg';
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || PROVIDED_KEY;

if (!apiKey) {
  console.error("❌ [CRÍTICO] Nenhuma chave de API encontrada!");
}

// Modelo de alta performance (2.0 Flash) - Sintonizado para velocidade industrial
export const AURORA_MODEL = 'googleai/gemini-2.0-flash';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    }),
  ],
});
