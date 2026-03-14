import { genkit } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/google-genai';

/**
 * 🔒 BLINDAGEM INDUSTRIAL AURORA IA - COMPROMISSO
 * 
 * Este arquivo configura o motor de inteligência da rede.
 * A chave de API é carregada do ambiente para garantir segurança e portabilidade.
 */

if (typeof window !== 'undefined') {
  throw new Error("⚠️ [SEGURANÇA] A configuração da Aurora IA não pode ser carregada no navegador.");
}

// Chave oficial do AI Studio (Goes1404)
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || "AIzaSyBSKWVh8V9HsDXUhLBuIAoSSBRPetzV-gM";

// Sincroniza a chave com o ambiente esperado pelo SDK interno
if (typeof process !== 'undefined') {
  process.env.GOOGLE_GENAI_API_KEY = apiKey;
  process.env.GEMINI_API_KEY = apiKey;
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    }),
  ],
});

// Exporta o modelo nativo para garantir que todos os fluxos usem a referência correta
export { gemini15Flash };
