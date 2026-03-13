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

// Chave de API fornecida pelo usuário para o ambiente de teste
const apiKey = "AIzaSyA4H7VjPSXx6J8rS88Cx_65-EnBY-89tyc";

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    }),
  ],
});
