import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * 🔒 MOTOR DE INTELIGÊNCIA AURORA IA - COMPROMISSO 360
 * Configuração Industrial para Next.js 15 e Google Gemini.
 * 
 * Suporta modelos 1.5, 2.0 e versões experimentais.
 */

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ [AVISO] GEMINI_API_KEY não localizada. Verifique as variáveis de ambiente.");
}

// Garante que a chave esteja disponível no ambiente global do processo para os plugins
if (typeof process !== 'undefined' && apiKey) {
  process.env.GOOGLE_GENAI_API_KEY = apiKey;
  process.env.GEMINI_API_KEY = apiKey;
  process.env.GOOGLE_API_KEY = apiKey;
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    }),
  ],
});
