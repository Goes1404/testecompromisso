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
  normalizarSala,
  rotuloDasTurmas,
  situacaoDaPresenca,
  formatarDuracao,
  validarDuvida,
  ordenarDuvidasParaProfessor,
  quandoE,
  linkDoStudio,
  agruparAgenda,
  urlDoChatEmbutido,
  linkDoChatEmJanela,
  ehNavegadorDeCelular,
  validarHorarioDaAula,
  filtroDaAgenda,
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
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

eq('aulão das 19h no ar às 20h01 continua na lista', estaNaAgenda({ status: 'live', start_time: as(19) }, agora), true);
eq('no ar há mais de 12h é esquecimento', estaNaAgenda({ status: 'live', start_time: as(7, 0) }, agora), false);
eq('agendada para mais tarde aparece', estaNaAgenda({ status: 'scheduled', start_time: as(21) }, agora), true);
eq('agendada com professor 2h atrasado aparece', estaNaAgenda({ status: 'scheduled', start_time: as(18) }, agora), true);
eq('agendada que nunca abriu some depois de 3h', estaNaAgenda({ status: 'scheduled', start_time: as(16) }, agora), false);
eq('encerrada não aparece', estaNaAgenda({ status: 'completed', start_time: as(19) }, agora), false);
eq('sem horário não aparece', estaNaAgenda({ status: 'scheduled', start_time: null }, agora), false);

// Caso real de 13/10: aula salva com o ano 2007 e aberta pelo professor.
// Pelo horário agendado ela "começou" 19 anos antes e sumia da lista.
const aberta = new Date(agora.getTime() - 5 * 60_000).toISOString();
eq('no ar com data agendada errada aparece (conta de quando abriu)',
  estaNaAgenda({ status: 'live', start_time: '2007-10-14T00:23:00Z', no_ar_desde: aberta }, agora), true);
eq('no ar desde ontem, esquecida, sai da lista',
  estaNaAgenda({ status: 'live', start_time: as(19), no_ar_desde: new Date(agora.getTime() - 13 * 3_600_000).toISOString() }, agora), false);
eq('no ar sem no_ar_desde (linha antiga) ainda usa o horário agendado',
  estaNaAgenda({ status: 'live', start_time: as(19), no_ar_desde: null }, agora), true);
eq('filtro do banco traz toda aula no ar', filtroDaAgenda(agora).endsWith(',status.eq.live'), true);

// Formulário do professor
eq('data de hoje mais tarde é aceita', validarHorarioDaAula(ymd(agora), '23:59', agora), null);
eq('ano 2007 é recusado', typeof validarHorarioDaAula('2007-10-13', '21:23', agora), 'string');
eq('ano 2062 é recusado', typeof validarHorarioDaAula('2062-10-13', '21:23', agora), 'string');
eq('campo vazio é recusado', typeof validarHorarioDaAula('', '19:00', agora), 'string');


// ── Botão do estúdio ──
eq('agendada abre', proximoStatus('scheduled').para, 'live');
eq('no ar encerra, não volta para agendada', proximoStatus('live').para, 'completed');
eq('encerrada pode reabrir', proximoStatus('completed').para, 'live');

// ── Turmas (espelho de public.sala_normalizada, testada no Postgres) ──
eq('salas como o cadastro tem', ['01', 'sala 2', 'Sala 05', '10', '07', '0', 'Não informada', '', null, 'Turma A'].map(normalizarSala),
  ['1', '2', '5', '10', '7', null, null, null, null, null]);
eq('todas', rotuloDasTurmas([]), 'Todas as turmas');
eq('uma', rotuloDasTurmas(['3']), 'Sala 3');
eq('várias em ordem numérica', rotuloDasTurmas(['10', '2', '1']), 'Salas 1, 2 e 10');
eq('repetida e mal escrita', rotuloDasTurmas(['01', '1', 'sala 2']), 'Salas 1 e 2');

// ── Presença: 60% da aula ──
eq('36 de 60 min é presente', situacaoDaPresenca(36 * 60, 60 * 60), { porcentagem: 60, presente: true });
eq('35 de 60 min é ausente', situacaoDaPresenca(35 * 60, 60 * 60), { porcentagem: 58, presente: false });
eq('aula que não começou', situacaoDaPresenca(0, 0), { porcentagem: 0, presente: false });
eq('não passa de 100%', situacaoDaPresenca(700, 600).porcentagem, 100);
eq('duração em segundos', formatarDuracao(45), '45 s');
eq('duração em minutos', formatarDuracao(12 * 60 + 30), '12 min');
eq('duração em horas', formatarDuracao(65 * 60), '1h05');

// ── Dúvidas ──
eq('dúvida vazia', validarDuvida('   '), 'Escreva sua dúvida antes de enviar.');
eq('dúvida comprida demais', validarDuvida('x'.repeat(501)), 'A dúvida pode ter até 500 caracteres.');
eq('dúvida no limite passa', validarDuvida(' ' + 'x'.repeat(500) + ' '), null);
const d = (id: string, min: number, is_answered = false, oculta = false) =>
  ({ id, created_at: new Date(2026, 9, 14, 19, min).toISOString(), is_answered, oculta });
eq('fila do professor',
  ordenarDuvidasParaProfessor([
    d('respondida-cedo', 1, true), d('pendente-nova', 9), d('oculta', 2, false, true),
    d('pendente-antiga', 3), d('respondida-tarde', 8, true),
  ]).map((x) => x.id),
  ['pendente-antiga', 'pendente-nova', 'respondida-tarde', 'respondida-cedo', 'oculta']);

// ── Datas na tela ──
const noite = new Date(2026, 9, 14, 22, 0); // qua 14/10, 22h
eq('hoje', quandoE(new Date(2026, 9, 14, 23, 30).toISOString(), noite), 'Hoje, 23:30');
eq('amanhã cedo, a menos de 24 h', quandoE(new Date(2026, 9, 15, 8, 5).toISOString(), noite), 'Amanhã, 08:05');
eq('ontem', quandoE(new Date(2026, 9, 13, 19, 0).toISOString(), noite), 'Ontem, 19:00');
eq('semana que vem', quandoE(new Date(2026, 9, 21, 19, 0).toISOString(), noite), 'qua, 21/10 · 19:00');
eq('sem horário', quandoE(null, noite), 'Sem horário');
eq('studio com id válido', linkDoStudio(ID), `https://studio.youtube.com/video/${ID}/livestreaming`);
eq('studio recusa lixo', linkDoStudio('../../x'), null);

// ── Agenda do professor ──
{
  const ag = new Date(2026, 9, 14, 20, 0);
  const em = (h: number, dia = 14) => new Date(2026, 9, dia, h, 0).toISOString();
  const g = agruparAgenda([
    { id: 'velha-encerrada', status: 'completed', start_time: em(19, 10) },
    { id: 'no-ar', status: 'live', start_time: em(19) },
    { id: 'semana-que-vem', status: 'scheduled', start_time: em(19, 21) },
    { id: 'atrasada-1h', status: 'scheduled', start_time: em(19) },
    { id: 'amanha', status: 'scheduled', start_time: em(19, 15) },
    { id: 'nunca-abriu', status: 'scheduled', start_time: em(10, 12) },
    { id: 'encerrada-hoje', status: 'completed', start_time: em(14) },
  ], ag);
  eq('agenda: no ar', g.noAr.map((a) => a.id), ['no-ar']);
  eq('agenda: próximas, atrasada primeiro', g.proximas.map((a) => a.id), ['atrasada-1h', 'amanha', 'semana-que-vem']);
  eq('agenda: anteriores, recente primeiro', g.anteriores.map((a) => a.id), ['encerrada-hoje', 'nunca-abriu', 'velha-encerrada']);
}

// ── Chat do YouTube ──
eq('chat embutido no domínio da escola', urlDoChatEmbutido(ID, 'compromissose.com'),
  `https://www.youtube.com/live_chat?v=${ID}&embed_domain=compromissose.com&dark_theme=1`);
eq('chat recusa id ruim', urlDoChatEmbutido('x', 'compromissose.com'), null);
eq('chat recusa domínio com lixo', urlDoChatEmbutido(ID, 'a.com&v=zzz'), null);
eq('chat em janela', linkDoChatEmJanela(ID), `https://www.youtube.com/live_chat?is_popout=1&v=${ID}`);
eq('Android é celular', ehNavegadorDeCelular('Mozilla/5.0 (Linux; Android 14; SM-A145M) AppleWebKit/537.36 Chrome/129 Mobile Safari/537.36'), true);
eq('iPhone é celular', ehNavegadorDeCelular('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'), true);
eq('Windows não é', ehNavegadorDeCelular('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129 Safari/537.36'), false);

if (falhas) {
  console.error(`\n${falhas} falha(s)`);
  process.exit(1);
}
console.log('\nlives: tudo certo');
