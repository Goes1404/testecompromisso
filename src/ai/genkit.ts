import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * 🔒 BLINDAGEM INDUSTRIAL AURORA IA - COMPROMISSO
 * 
 * Este arquivo configura o motor de inteligência da rede.
 * A chave de API está fixada para garantir o funcionamento imediato
 * na nova conta do AI Studio.
 */

if (typeof window !== 'undefined') {
  throw new Error("⚠️ [SEGURANÇA] A configuração da Aurora IA não pode ser carregada no navegador.");
}

// Chave oficial do AI Studio (Goes1404)
const apiKey = process.env.GEMINI_API_KEY || "AIzaSyBSKWVh8V9HsDXUhLBuIAoSSBRPetzV-gM";

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    }),
  ],
});