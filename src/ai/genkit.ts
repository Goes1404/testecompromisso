import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * 🔒 BLINDAGEM INDUSTRIAL AURORA IA - COMPROMISSO
 * 
 * Este arquivo centraliza a inteligência da plataforma.
 * A configuração é EXCLUSIVAMENTE servidora para proteger as credenciais de rede.
 */

if (typeof window !== 'undefined') {
  throw new Error("⚠️ [SEGURANÇA] A Aurora IA só pode ser operada no Gabinete de Gestão (Servidor).");
}

// Prioridade: Variável de Ambiente > Chave de Teste Fornecida pelo Usuário
const apiKey = process.env.GEMINI_API_KEY || 
               process.env.GOOGLE_GENAI_API_KEY || 
               "AIzaSyA4H7VjPSXx6J8rS88Cx_65-EnBY-89tyc";

if (!apiKey || apiKey.includes('placeholder')) {
  console.warn("⚠️ [ALERTA] Chave da Aurora não localizada. O motor de IA entrará em modo de espera.");
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    }),
  ],
});
