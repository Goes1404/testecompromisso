import fs from 'fs';
import path from 'path';

// Carregar variáveis de ambiente do .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const geminiKey = env['GEMINI_API_KEY'];

async function chatWithAurora(promptText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
  
  const payload = {
    contents: [{
      role: 'user',
      parts: [{ text: promptText }]
    }],
    systemInstruction: {
      parts: [{
        text: "Você é a Aurora, a inteligência artificial educacional da plataforma Compromisso. Seja encorajadora, didática e responda em português do Brasil focando em vestibulares (ENEM e ETEC)."
      }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    return { error: data };
  }
  return data.candidates[0].content.parts[0].text;
}

async function runTests() {
  const essayPrompt = `Por favor, atue como corretor do ENEM. Avalie esta redação com tema: "Os impactos da Inteligência Artificial na educação". Me dê uma nota de 0 a 1000 e um feedback curto. Redação: "A inteligencia artificial vem mudando muito as escolas hj em dia. os alunos usam o chatgpt pra faser os trabalhos e não aprendem de verdade, isso e um problema ruim pq o futuro da nação depende do estudo e com essas ias ninguem vai estuda mais. portanto o governo presiza proibi o uso de celular nas escols."`;
  const doubtPrompt = `Me explica a diferença entre meiose e mitose de um jeito bem fácil pra eu passar na prova da ETEC semana que vem?`;

  const essayResponse = await chatWithAurora(essayPrompt);
  const doubtResponse = await chatWithAurora(doubtPrompt);

  fs.writeFileSync('aurora-results.json', JSON.stringify({
    essay: essayResponse,
    doubt: doubtResponse
  }, null, 2));
}

runTests();
