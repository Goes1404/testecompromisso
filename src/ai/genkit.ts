import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * 🔒 MOTOR DE INTELIGÊNCIA AURORA IA - COMPROMISSO 360
 * Configuração Industrial para Next.js 15 e Google Gemini.
 * 
 * Sintonizado para aceitar a chave de teste fornecida.
 */

const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBSKWVh8V9HsDXUhLBuIAoSSBRPetzV-gM";

// Garante que a chave esteja disponível no ambiente global do processo para os plugins
if (typeof process !== 'undefined') {
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