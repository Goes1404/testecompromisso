/**
 * Testes da verificação do vídeo do YouTube antes de abrir a sala.
 * `npx tsx scripts/test-live-video.ts`
 *
 * O que está sob teste é a leitura da resposta do oEmbed: trocar um status
 * de lugar faria a sala abrir com vídeo privado (erro para ~855 alunos) ou,
 * pior, barrar a aula só porque o YouTube demorou a responder.
 */
import {
  bloqueiaAbertura,
  interpretarOembed,
  mensagemDaVerificacao,
  urlDoOembed,
  verificacaoIndisponivel,
} from '../src/lib/live-video';

let falhas = 0;
const eq = (nome: string, obtido: unknown, esperado: unknown) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${nome}${ok ? '' : ` → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
};

// URL do oEmbed: o link do vídeo vai codificado, em JSON.
eq('url do oembed', urlDoOembed('aBc_123-xYz'), 'https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DaBc_123-xYz&format=json');

// 200: pode embutir, com título e canal.
eq('200 vira ok com título e canal', interpretarOembed(200, { title: ' Aulão de Física ', author_name: 'Cursinho Compromisso' }), {
  ok: true, titulo: 'Aulão de Física', canal: 'Cursinho Compromisso',
});
eq('200 sem corpo ainda é ok', interpretarOembed(200, null), { ok: true, titulo: null, canal: null });
eq('200 com título vazio vira null', interpretarOembed(200, { title: '   ' }), { ok: true, titulo: null, canal: null });

// Os "não" definitivos: o YouTube garante que o aluno não veria.
eq('401 = incorporação desligada', interpretarOembed(401, null), { ok: false, motivo: 'nao_embute', definitivo: true });
eq('403 = privado', interpretarOembed(403, null), { ok: false, motivo: 'privado', definitivo: true });
eq('404 = não existe', interpretarOembed(404, null), { ok: false, motivo: 'nao_encontrado', definitivo: true });
eq('400 = id que o YouTube não resolve', interpretarOembed(400, null), { ok: false, motivo: 'nao_encontrado', definitivo: true });

// Tudo o mais é "não deu para perguntar" — e NÃO barra a aula.
for (const status of [0, 429, 500, 502, 503]) {
  eq(`${status} = indisponível, não definitivo`, interpretarOembed(status, null), { ok: false, motivo: 'indisponivel', definitivo: false });
}
eq('falha de rede = indisponível', verificacaoIndisponivel(), { ok: false, motivo: 'indisponivel', definitivo: false });

// A régua de abrir a sala.
eq('ok não bloqueia', bloqueiaAbertura(interpretarOembed(200, {})), false);
eq('privado bloqueia', bloqueiaAbertura(interpretarOembed(403, null)), true);
eq('sem incorporação bloqueia', bloqueiaAbertura(interpretarOembed(401, null)), true);
eq('apagado bloqueia', bloqueiaAbertura(interpretarOembed(404, null)), true);
eq('YouTube fora NÃO bloqueia', bloqueiaAbertura(interpretarOembed(503, null)), false);
eq('sem verificação não bloqueia', bloqueiaAbertura(null), false);

// A mensagem diz onde consertar.
eq('mensagem de incorporação cita o YouTube Studio', /YouTube Studio/.test(mensagemDaVerificacao(interpretarOembed(401, null)).descricao), true);
eq('mensagem de privado manda para Não listado', /Não listado/.test(mensagemDaVerificacao(interpretarOembed(403, null)).descricao), true);
eq('mensagem de apagado manda editar a aula', /Editar aula/.test(mensagemDaVerificacao(interpretarOembed(404, null)).descricao), true);
eq('mensagem de indisponível diz que a sala pode abrir', /pode abrir/.test(mensagemDaVerificacao(interpretarOembed(500, null)).descricao), true);
eq('mensagem de ok mostra o título', mensagemDaVerificacao(interpretarOembed(200, { title: 'Aulão', author_name: 'Canal' })).descricao, '"Aulão" · Canal');

if (falhas) {
  console.error(`\nverificação do vídeo: ${falhas} falha(s)`);
  process.exit(1);
}
console.log('\nverificação do vídeo: tudo certo');
