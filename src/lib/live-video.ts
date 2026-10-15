/**
 * Verificação do vídeo do YouTube antes de abrir a sala.
 *
 * O aluno só vê o aulão se a transmissão for pública ou não listada E com
 * "Permitir incorporação" ligado. Quando não é, o iframe mostra um erro
 * (150/153/101) — e o professor só descobre pelos ~855 alunos reclamando.
 *
 * O oEmbed do YouTube (`/oembed?url=…`) responde sem chave de API e diz
 * exatamente isso pelo status HTTP. Medido em 15/10/2026:
 *
 * | status | o que é                                            |
 * |--------|----------------------------------------------------|
 * | 200    | existe e pode ser embutido (traz título e canal)   |
 * | 401    | existe, mas o dono desligou a incorporação         |
 * | 403    | privado                                            |
 * | 400    | id malformado (ou vídeo que o YouTube não resolve) |
 * | 404    | não existe                                         |
 *
 * Tudo aqui é puro (sem fetch, sem React) para caber em
 * `scripts/test-live-video.ts`. Quem busca é `/api/live/verificar-video`.
 */

export type MotivoDaVerificacao = 'nao_embute' | 'privado' | 'nao_encontrado' | 'indisponivel';

export type Verificacao =
  | { ok: true; titulo: string | null; canal: string | null }
  | {
      ok: false;
      motivo: MotivoDaVerificacao;
      /**
       * `true`: o YouTube disse que o vídeo não vai abrir para o aluno — a
       * sala não deve abrir até o professor corrigir. `false`: não deu para
       * perguntar (YouTube fora, rede, limite) — a aula não pode ficar refém
       * disso, então a sala abre com aviso.
       */
      definitivo: boolean;
    };

export function urlDoOembed(id: string): string {
  const video = encodeURIComponent(`https://www.youtube.com/watch?v=${id}`);
  return `https://www.youtube.com/oembed?url=${video}&format=json`;
}

/** Traduz a resposta do oEmbed (status + JSON, se houver) na verificação. */
export function interpretarOembed(status: number, corpo: unknown): Verificacao {
  if (status === 200) {
    const o = (corpo && typeof corpo === 'object' ? corpo : {}) as Record<string, unknown>;
    return {
      ok: true,
      titulo: typeof o.title === 'string' && o.title.trim() ? o.title.trim() : null,
      canal: typeof o.author_name === 'string' && o.author_name.trim() ? o.author_name.trim() : null,
    };
  }
  if (status === 401) return { ok: false, motivo: 'nao_embute', definitivo: true };
  if (status === 403) return { ok: false, motivo: 'privado', definitivo: true };
  if (status === 400 || status === 404) return { ok: false, motivo: 'nao_encontrado', definitivo: true };
  return { ok: false, motivo: 'indisponivel', definitivo: false };
}

/** Falha de rede/timeout: o YouTube não respondeu. */
export function verificacaoIndisponivel(): Verificacao {
  return { ok: false, motivo: 'indisponivel', definitivo: false };
}

/** A sala não abre com um vídeo que o YouTube garante que o aluno não verá. */
export function bloqueiaAbertura(v: Verificacao | null | undefined): boolean {
  return !!v && !v.ok && v.definitivo;
}

/** Texto para o professor: o que está errado e onde se conserta. */
export function mensagemDaVerificacao(v: Verificacao): { titulo: string; descricao: string } {
  if (v.ok) {
    return {
      titulo: 'Vídeo pronto para os alunos',
      descricao: v.titulo ? `"${v.titulo}"${v.canal ? ` · ${v.canal}` : ''}` : 'O YouTube confirmou que ele abre aqui dentro.',
    };
  }
  switch (v.motivo) {
    case 'nao_embute':
      return {
        titulo: 'O vídeo não abre dentro da plataforma',
        descricao:
          'No YouTube Studio, abra a transmissão → Detalhes → Mostrar mais → marque "Permitir incorporação" e salve. Depois verifique de novo.',
      };
    case 'privado':
      return {
        titulo: 'O vídeo está privado',
        descricao: 'No YouTube Studio, mude a visibilidade para "Não listado". Público também funciona; privado não abre para ninguém.',
      };
    case 'nao_encontrado':
      return {
        titulo: 'O YouTube não achou esse vídeo',
        descricao: 'O link pode estar errado ou a transmissão foi apagada. Cole o link de novo em "Editar aula".',
      };
    default:
      return {
        titulo: 'Não deu para conferir o vídeo agora',
        descricao: 'O YouTube não respondeu. A sala pode abrir mesmo assim; confira você mesmo se o vídeo aparece aqui no estúdio.',
      };
  }
}
