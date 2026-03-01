
// Script de teste para validar a chave de API e a conexão com o Gemini
// Execute com: node test-ai-feature.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Chave fornecida pelo usuário para teste
const TEST_KEY = "AIzaSyAh2ClldUdbLvDXH9O3USELgPb3GCOrHBA";

async function main() {
  console.log("🔵 Iniciando teste de diagnóstico Aurora IA...");
  
  const genAI = new GoogleGenerativeAI(TEST_KEY);

  try {
    // Usando o modelo gemini-2.5-flash para evitar o limite de taxa do gemini-3
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = "Diga apenas 'Conexão Aurora OK' se você estiver me ouvindo.";
    
    console.log("📡 Enviando requisição ao Google AI...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("\n✅ SUCESSO! Resposta da IA:");
    console.log("----------------------------");
    console.log(text.trim());
    console.log("----------------------------");
    console.log("\nA chave é válida e o modelo gemini-2.5-flash está respondendo.");
  } catch (error) {
    console.error("\n❌ ERRO NO DIAGNÓSTICO:");
    console.error("Mensagem:", error.message);
    if (error.message.includes("API key not valid")) {
      console.error("Dica: A chave fornecida parece ser inválida ou está restrita.");
    }
  }
}

main();
