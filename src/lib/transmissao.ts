/**
 * Transmissão pela própria plataforma (Cloudflare Realtime, WebRTC).
 * Regras puras, usadas no navegador e no servidor. Testes:
 * `scripts/test-transmissao.ts`.
 *
 * O professor publica até quatro faixas; o aluno puxa as que existirem.
 */

export type NomeDaFaixa = "tela" | "camera" | "audio-mic" | "audio-tela";
export type FaixaPublicada = { nome: NomeDaFaixa; tipo: "video" | "audio" };
export type FaixaComMid = FaixaPublicada & { mid: string };

export const NOMES_VALIDOS: readonly NomeDaFaixa[] = ["tela", "camera", "audio-mic", "audio-tela"];

/** STUN do próprio Cloudflare; TURN quase nunca é necessário com o SFU deles. */
export const SERVIDORES_ICE: RTCIceServer[] = [{ urls: "stun:stun.cloudflare.com:3478" }];

/**
 * Qualidade de envio. A tela vai a 15 quadros e até 1,2 Mbps: texto de slide
 * fica nítido e cada aluno gasta ~0,5 GB por hora (o Cloudflare cobra por GB
 * entregue, com 1.000 GB grátis). A câmera é só o rosto no canto: 300 kbps.
 */
export const QUALIDADE = {
  tela: { maxBitrate: 1_200_000, maxFramerate: 15 },
  camera: { maxBitrate: 300_000, maxFramerate: 15 },
} as const;

/** Gasto estimado de banda, para o estúdio mostrar ao professor. */
export function gbPorHora(alunos: number, kbps = 1_300): number {
  return Math.round(((alunos * kbps * 1000 * 3600) / 8 / 1e9) * 10) / 10;
}

/**
 * Confere a lista de faixas que o navegador do professor diz ter publicado.
 * Só aceita os quatro nomes conhecidos, cada um uma vez, com `mid` presente,
 * e exige pelo menos a tela ou a câmera (transmitir só áudio não é aula).
 */
export function validarFaixas(entrada: unknown): { ok: true; faixas: FaixaComMid[] } | { ok: false; erro: string } {
  if (!Array.isArray(entrada) || entrada.length === 0 || entrada.length > 4) {
    return { ok: false, erro: "Lista de faixas inválida." };
  }
  const vistos = new Set<string>();
  const faixas: FaixaComMid[] = [];
  for (const f of entrada as any[]) {
    const nome = f?.nome;
    const mid = typeof f?.mid === "string" ? f.mid : typeof f?.mid === "number" ? String(f.mid) : null;
    if (!NOMES_VALIDOS.includes(nome) || !mid || vistos.has(nome)) {
      return { ok: false, erro: "Lista de faixas inválida." };
    }
    vistos.add(nome);
    faixas.push({ nome, mid, tipo: nome === "tela" || nome === "camera" ? "video" : "audio" });
  }
  if (!vistos.has("tela") && !vistos.has("camera")) {
    return { ok: false, erro: "Transmita pelo menos a tela ou a câmera." };
  }
  return { ok: true, faixas };
}

/** As faixas guardadas em `lives.transmissao_faixas`, já filtradas. */
export function faixasDaAula(valor: unknown): FaixaPublicada[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((f: any) => NOMES_VALIDOS.includes(f?.nome))
    .map((f: any) => ({ nome: f.nome as NomeDaFaixa, tipo: f.nome === "tela" || f.nome === "camera" ? "video" : "audio" }));
}

/**
 * Para onde vai cada faixa recebida na tela do aluno: a tela (ou, sem tela, a
 * câmera) no vídeo grande; a câmera, havendo tela, no canto; os áudios juntos
 * no vídeo grande.
 */
export function destinoDaFaixa(nome: NomeDaFaixa, publicadas: FaixaPublicada[]): "principal" | "canto" {
  if (nome === "camera" && publicadas.some((f) => f.nome === "tela")) return "canto";
  return "principal";
}

/** Status da transmissão para o professor, em português. */
export function rotuloDoEstado(estado: EstadoDaTransmissao): string {
  switch (estado) {
    case "parado":
      return "Sem transmissão";
    case "preparando":
      return "Escolha a tela";
    case "conectando":
      return "Conectando…";
    case "no_ar":
      return "Transmitindo";
    case "erro":
      return "Falhou";
  }
}

export type EstadoDaTransmissao = "parado" | "preparando" | "conectando" | "no_ar" | "erro";

/** Mensagem para quem tenta transmitir de onde não dá (celular, navegador velho). */
export function podeTransmitirAqui(nav: { mediaDevices?: { getDisplayMedia?: unknown } } | undefined, ua: string): string | null {
  if (!nav?.mediaDevices?.getDisplayMedia || /Android|iPhone|iPad|iPod/i.test(ua)) {
    return "Para transmitir a tela, use um computador com Chrome, Edge ou Firefox.";
  }
  return null;
}
