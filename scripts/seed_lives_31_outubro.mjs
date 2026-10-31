/**
 * Grade do aulão de sábado (31/10): 6 aulas ENEM + 6 ETEC, uma transmissão
 * contínua do YouTube por foco.
 * `node scripts/seed_lives_31_outubro.mjs <link do YouTube ENEM> <link do YouTube ETEC>`
 *
 * Para outro sábado: copie, troque os dois vídeos, as datas e os professores.
 * Rode na VÉSPERA, entre 7h e 22h: o cron avisa "aulas marcadas" uma vez só, e
 * o banco abre e encerra cada aula sozinho no sábado (`termina_em`).
 * Pode rodar de novo para corrigir: nada é apagado (ver `seedLives`).
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envLocalPath = join(__dirname, '..', '.env.local');

if (fs.existsSync(envLocalPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not found.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// O link de cada foco vem da linha de comando: o professor cria a transmissão
// no YouTube Studio e manda o link na hora.
function idDoYoutube(link) {
  const m = String(link ?? '').match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
const [ENEM_YOUTUBE, ETEC_YOUTUBE] = process.argv.slice(2);
const ENEM_YOUTUBE_ID = idDoYoutube(ENEM_YOUTUBE);
const ETEC_YOUTUBE_ID = idDoYoutube(ETEC_YOUTUBE);
if (!ENEM_YOUTUBE_ID || !ETEC_YOUTUBE_ID) {
  console.error('Uso: node scripts/seed_lives_31_outubro.mjs <link do YouTube ENEM> <link do YouTube ETEC>');
  process.exit(1);
}

const grade = [
  {
    title: 'Biologia — ENEM',
    description: 'Sábado 31/10, aula online da Sala 1 – ENEM, das 08:00 às 08:35 com Fabiano.',
    start_time: '2026-10-31T11:00:00+00:00',
    teacher_name: 'Fabiano',
    teacher_id: null,
    foco: 'ENEM',
  },
  {
    title: 'Redação — ENEM',
    description: 'Sábado 31/10, aula online da Sala 1 – ENEM, das 08:40 às 09:15 com Valéria.',
    start_time: '2026-10-31T11:40:00+00:00',
    teacher_name: 'Valéria',
    teacher_id: null,
    foco: 'ENEM',
  },
  {
    title: 'Redação — ENEM',
    description: 'Sábado 31/10, aula online da Sala 1 – ENEM, das 09:20 às 09:55 com Valéria.',
    start_time: '2026-10-31T12:20:00+00:00',
    teacher_name: 'Valéria',
    teacher_id: null,
    foco: 'ENEM',
  },
  {
    title: 'Física — ENEM',
    description: 'Sábado 31/10, aula online da Sala 1 – ENEM, das 10:20 às 10:55 com Pedro.',
    start_time: '2026-10-31T13:20:00+00:00',
    teacher_name: 'Pedro',
    teacher_id: '32918203-86d0-49d2-8441-a7c4645242f6',
    foco: 'ENEM',
  },
  {
    title: 'Matemática — ENEM',
    description: 'Sábado 31/10, aula online da Sala 1 – ENEM, das 11:00 às 11:35 com Helio.',
    start_time: '2026-10-31T14:00:00+00:00',
    teacher_name: 'Helio',
    teacher_id: '7d5e55b9-93e0-446b-88d6-9d6d24e82961',
    foco: 'ENEM',
  },
  {
    title: 'Língua Portuguesa — ENEM',
    description: 'Sábado 31/10, aula online da Sala 1 – ENEM, das 11:40 às 12:15 com Prô Jota.',
    start_time: '2026-10-31T14:40:00+00:00',
    teacher_name: 'Prô Jota',
    teacher_id: null,
    foco: 'ENEM',
  },
  {
    title: 'Matemática — ETEC',
    description: 'Sábado 31/10, aula online da Sala 1 – ETEC, das 08:00 às 08:35 com Helio.',
    start_time: '2026-10-31T11:00:00+00:00',
    teacher_name: 'Helio',
    teacher_id: '7d5e55b9-93e0-446b-88d6-9d6d24e82961',
    foco: 'ETEC',
  },
  {
    title: 'Biologia — ETEC',
    description: 'Sábado 31/10, aula online da Sala 1 – ETEC, das 08:40 às 09:15 com Fabiano.',
    start_time: '2026-10-31T11:40:00+00:00',
    teacher_name: 'Fabiano',
    teacher_id: null,
    foco: 'ETEC',
  },
  {
    title: 'Física — ETEC',
    description: 'Sábado 31/10, aula online da Sala 1 – ETEC, das 09:20 às 09:55 com Pedro.',
    start_time: '2026-10-31T12:20:00+00:00',
    teacher_name: 'Pedro',
    teacher_id: '32918203-86d0-49d2-8441-a7c4645242f6',
    foco: 'ETEC',
  },
  {
    title: 'Língua Portuguesa — ETEC',
    description: 'Sábado 31/10, aula online da Sala 1 – ETEC, das 10:20 às 10:55 com Prô Jota.',
    start_time: '2026-10-31T13:20:00+00:00',
    teacher_name: 'Prô Jota',
    teacher_id: null,
    foco: 'ETEC',
  },
  {
    title: 'Língua Portuguesa — ETEC',
    description: 'Sábado 31/10, aula online da Sala 1 – ETEC, das 11:00 às 11:35 com Prô Jota.',
    start_time: '2026-10-31T14:00:00+00:00',
    teacher_name: 'Prô Jota',
    teacher_id: null,
    foco: 'ETEC',
  },
  {
    title: 'Física — ETEC',
    description: 'Sábado 31/10, aula online da Sala 1 – ETEC, das 11:40 às 12:15 com Pedro.',
    start_time: '2026-10-31T14:40:00+00:00',
    teacher_name: 'Pedro',
    teacher_id: '32918203-86d0-49d2-8441-a7c4645242f6',
    foco: 'ETEC',
  },
];

const livesData = grade.map(({ foco, ...aula }) => {
  const link = foco === 'ENEM' ? ENEM_YOUTUBE : ETEC_YOUTUBE;
  const id = foco === 'ENEM' ? ENEM_YOUTUBE_ID : ETEC_YOUTUBE_ID;
  return { ...aula, turmas: [foco], meet_link: link, youtube_url: link, youtube_id: id, url: link, status: 'scheduled' };
});

async function seedLives() {
  console.log('Grade de 31/10: 12 aulas...');

  // termina_em liga a grade automática (migration 20261026120000): o banco abre
  // cada aula na hora e encerra no fim, e o encerramento gera a chamada. Sem
  // ele, as aulas ficam presas como em 24/10. Cada aula dura 35 min.
  const DURACAO_DA_AULA_MIN = 35;
  const comFim = livesData.map((l) => ({
    ...l,
    termina_em: new Date(new Date(l.start_time).getTime() + DURACAO_DA_AULA_MIN * 60_000).toISOString(),
  }));

  // Rodar de novo NÃO apaga nem recria: em 24/10 o script rodou duas vezes,
  // apagou as aulas e criou outras — cada aluno recebeu "5 aulas marcadas" de
  // novo e os links das notificações anteriores morreram. Agora a aula que já
  // existe (mesmo horário e título) só tem link, professor e fim atualizados;
  // status e marcas de aviso ficam como estão.
  const dias = [...new Set(comFim.map((l) => l.start_time.slice(0, 10)))];
  const { data: existentes, error: erroLeitura } = await supabase
    .from('lives')
    .select('id, title, start_time')
    .gte('start_time', `${dias[0]}T00:00:00+00:00`)
    .lte('start_time', `${dias[dias.length - 1]}T23:59:59+00:00`);
  if (erroLeitura) {
    console.error('Erro ao ler a grade existente:', erroLeitura);
    return;
  }
  const chave = (l) => `${new Date(l.start_time).toISOString()}|${l.title}`;
  const porChave = new Map((existentes ?? []).map((l) => [chave(l), l.id]));

  const novas = comFim.filter((l) => !porChave.has(chave(l)));
  for (const l of comFim.filter((x) => porChave.has(chave(x)))) {
    const { status, ...semStatus } = l;
    const { error: erroAtualizar } = await supabase.from('lives').update(semStatus).eq('id', porChave.get(chave(l)));
    if (erroAtualizar) console.error(`Erro ao atualizar ${l.title}:`, erroAtualizar);
  }
  console.log(`${comFim.length - novas.length} aula(s) já existiam e foram atualizadas.`);

  const { data, error } = novas.length
    ? await supabase.from('lives').insert(novas).select()
    : { data: [], error: null };

  if (error) {
    console.error('Error inserting lives:', error);
  } else {
    console.log(`${data.length} aula(s) nova(s) criada(s).`);
    console.table(
      data.map((l) => ({
        id: l.id,
        title: l.title,
        teacher: l.teacher_name,
        start_time: l.start_time,
        turmas: l.turmas?.join(', '),
        meet_link: l.meet_link,
      }))
    );
  }
}

seedLives();
