import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * 🔒 MOTOR DE INTELIGÊNCIA AURORA IA - COMPROMISSO 360
 * Configuração Industrial para Next.js 15 e Google Gemini.
 * 
 * Sintonizado para suporte total no Netlify e ambientes Serverless.
 */

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
  console.error("❌ [CRÍTICO] Nenhuma chave de API detectada no ambiente! O deploy pode falhar.");
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
