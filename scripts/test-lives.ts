/**
 * Testes das aulas ao vivo.
 * `npx tsx scripts/test-lives.ts`
 *
 * Duas coisas estão sob teste: a leitura do link do YouTube que o professor
 * cola (se errar, o aulão vira tela preta para 855 alunos) e a regra de quando
 * a aula aparece na agenda (o corte antigo de 1 hora tirava a aula da lista no
 * meio dela).
 */
import {
  idDoYoutube,
  urlDoPlayer,
  linkExternoSeguro,
  estaNaAgenda,
  proximoStatus,
} from '../src/lib/lives';

let falhas = 0;
const eq = (nome: string, obtido: unknown, esperado: unknown) => {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${nome}${ok ? '' : ` → obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`}`);
};

const ID = 'aBc_123-xYz';

// ── Links que o professor cola ──
eq('youtube.com/live/ID', idDoYoutube(`https://www.youtube.com/live/${ID}?si=abc`), ID);
eq('youtu.be/ID', idDoYoutube(`https://youtu.be/${ID}?si=xyz`), ID);
eq('watch?v=ID', idDoYoutube(`https://www.youtube.com/watch?v=${ID}&t=30s`), ID);
eq('m.youtube.com', idDoYoutube(`https://m.youtube.com/watch?v=${ID}`), ID);
eq('embed/ID', idDoYoutube(`https://www.youtube.com/embed/${ID}`), ID);
eq('shorts/ID', idDoYoutube(`https://youtube.com/shorts/${ID}`), ID);
eq('YouTube Studio', idDoYoutube(`https://studio.youtube.com/video/${ID}/livestreaming`), ID);
eq('sem https', idDoYoutube(`youtube.com/live/${ID}`), ID);
eq('só o id', idDoYoutube(`  ${ID} `), ID);

// ── O que tem de ser recusado ──
eq('link do canal não é aula', idDoYoutube('https://www.youtube.com/@cursinhocompromisso/live'), null);
eq('canal por id', idDoYoutube('https://www.youtube.com/channel/UC1234567890abcdefghij'), null);
eq('id curto demais', idDoYoutube('https://youtu.be/abc'), null);
eq('outro site', idDoYoutube(`https://vimeo.com/${ID}`), null);
eq('domínio parecido', idDoYoutube(`https://youtube.com.golpe.net/live/${ID}`), null);
eq('javascript:', idDoYoutube('javascript:alert(1)'), null);
eq('vazio', idDoYoutube(''), null);
eq('null', idDoYoutube(null), null);

// ── Player ──
eq('player com id válido', urlDoPlayer(ID), `https://www.youtube.com/embed/${ID}?rel=0&playsinline=1`);
eq('player recusa lixo vindo do banco', urlDoPlayer('"><script>'), null);

// ── Link do Meet ──
eq('meet https passa', linkExternoSeguro('https://meet.google.com/abc-defg-hij'), 'https://meet.google.com/abc-defg-hij');
eq('javascript: barrado', linkExternoSeguro('javascript:alert(1)'), null);
eq('texto solto barrado', linkExternoSeguro('meet.google.com/abc'), null);

// ── Agenda do aluno ──
// 12/10, 20h01: um aulão das 19h está no meio.
const agora = new Date(2026, 9, 12, 20, 1);
const as = (h: number, m = 0, dia = 12) => new Date(2026, 9, dia, h, m).toISOString();

eq('aulão das 19h no ar às 20h01 continua na lista', estaNaAgenda({ status: 'live', start_time: as(19) }, agora), true);
eq('no ar há mais de 12h é esquecimento', estaNaAgenda({ status: 'live', start_time: as(7, 0) }, agora), false);
eq('agendada para mais tarde aparece', estaNaAgenda({ status: 'scheduled', start_time: as(21) }, agora), true);
eq('agendada com professor 2h atrasado aparece', estaNaAgenda({ status: 'scheduled', start_time: as(18) }, agora), true);
eq('agendada que nunca abriu some depois de 3h', estaNaAgenda({ status: 'scheduled', start_time: as(16) }, agora), false);
eq('encerrada não aparece', estaNaAgenda({ status: 'completed', start_time: as(19) }, agora), false);
eq('sem horário não aparece', estaNaAgenda({ status: 'scheduled', start_time: null }, agora), false);

// ── Botão do estúdio ──
eq('agendada abre', proximoStatus('scheduled').para, 'live');
eq('no ar encerra, não volta para agendada', proximoStatus('live').para, 'completed');
eq('encerrada pode reabrir', proximoStatus('completed').para, 'live');

if (falhas) {
  console.error(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log('\nlives: tudo certo');
