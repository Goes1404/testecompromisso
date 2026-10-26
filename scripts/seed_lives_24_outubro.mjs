/**
 * Grade do aulão de sábado (24/10): 6 aulas ENEM + 6 ETEC, uma transmissão
 * contínua do YouTube por foco. `node scripts/seed_lives_24_outubro.mjs`
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

const ENEM_YOUTUBE = 'https://www.youtube.com/watch?v=xFe2orDQry0';
const ENEM_YOUTUBE_ID = 'xFe2orDQry0';

const ETEC_YOUTUBE = 'https://www.youtube.com/watch?v=aruuw4-9hIs';
const ETEC_YOUTUBE_ID = 'aruuw4-9hIs';

const livesData = [
  // 08:00 - 08:35 (11:00 UTC)
  {
    title: 'Língua Portuguesa — ENEM',
    description: 'Sábado 24/10, aula online da Sala 1 – ENEM, das 08:00 às 08:35 com Prô Jota (L. P.).',
    start_time: '2026-10-24T11:00:00+00:00',
    teacher_name: 'Prô Jota',
    teacher_id: null,
    turmas: ['ENEM'],
    meet_link: ENEM_YOUTUBE,
    youtube_url: ENEM_YOUTUBE,
    youtube_id: ENEM_YOUTUBE_ID,
    url: ENEM_YOUTUBE,
    status: 'scheduled',
  },
  {
    title: 'Geografia — ETEC',
    description: 'Sábado 24/10, aula online da Sala 1 – ETEC, das 08:00 às 08:35 com James (G).',
    start_time: '2026-10-24T11:00:00+00:00',
    teacher_name: 'James',
    teacher_id: 'fa007a79-312f-4ed2-8726-73c224cf0fd9',
    turmas: ['ETEC'],
    meet_link: ETEC_YOUTUBE,
    youtube_url: ETEC_YOUTUBE,
    youtube_id: ETEC_YOUTUBE_ID,
    url: ETEC_YOUTUBE,
    status: 'scheduled',
  },

  // 08:40 - 09:15 (11:40 UTC)
  {
    title: 'Matemática — ENEM',
    description: 'Sábado 24/10, aula online da Sala 1 – ENEM, das 08:40 às 09:15 com Helio (M).',
    start_time: '2026-10-24T11:40:00+00:00',
    teacher_name: 'Helio',
    teacher_id: '7d5e55b9-93e0-446b-88d6-9d6d24e82961',
    turmas: ['ENEM'],
    meet_link: ENEM_YOUTUBE,
    youtube_url: ENEM_YOUTUBE,
    youtube_id: ENEM_YOUTUBE_ID,
    url: ENEM_YOUTUBE,
    status: 'scheduled',
  },
  {
    title: 'Química — ETEC',
    description: 'Sábado 24/10, aula online da Sala 1 – ETEC, das 08:40 às 09:15 com Jorgênio (Q).',
    start_time: '2026-10-24T11:40:00+00:00',
    teacher_name: 'Jorgênio',
    teacher_id: '34ad151f-3b3e-4524-972b-32003267e180',
    turmas: ['ETEC'],
    meet_link: ETEC_YOUTUBE,
    youtube_url: ETEC_YOUTUBE,
    youtube_id: ETEC_YOUTUBE_ID,
    url: ETEC_YOUTUBE,
    status: 'scheduled',
  },

  // 09:20 - 09:55 (12:20 UTC)
  {
    title: 'Atualidades — ENEM',
    description: 'Sábado 24/10, aula online da Sala 1 – ENEM, das 09:20 às 09:55 com Alexandre (Atualidades).',
    start_time: '2026-10-24T12:20:00+00:00',
    teacher_name: 'Alexandre',
    teacher_id: '00c6275b-e01c-4ab3-ad70-78b80fe6bae2',
    turmas: ['ENEM'],
    meet_link: ENEM_YOUTUBE,
    youtube_url: ENEM_YOUTUBE,
    youtube_id: ENEM_YOUTUBE_ID,
    url: ENEM_YOUTUBE,
    status: 'scheduled',
  },
  {
    title: 'Língua Portuguesa — ETEC',
    description: 'Sábado 24/10, aula online da Sala 1 – ETEC, das 09:20 às 09:55 com Fernando (LP).',
    start_time: '2026-10-24T12:20:00+00:00',
    teacher_name: 'Fernando',
    teacher_id: '35333018-e8e8-4a33-9f05-9a47e4d18846',
    turmas: ['ETEC'],
    meet_link: ETEC_YOUTUBE,
    youtube_url: ETEC_YOUTUBE,
    youtube_id: ETEC_YOUTUBE_ID,
    url: ETEC_YOUTUBE,
    status: 'scheduled',
  },

  // 10:20 - 10:55 (13:20 UTC)
  {
    title: 'Física — ENEM',
    description: 'Sábado 24/10, aula online da Sala 1 – ENEM, das 10:20 às 10:55 com Pedro (F).',
    start_time: '2026-10-24T13:20:00+00:00',
    teacher_name: 'Pedro',
    teacher_id: '32918203-86d0-49d2-8441-a7c4645242f6',
    turmas: ['ENEM'],
    meet_link: ENEM_YOUTUBE,
    youtube_url: ENEM_YOUTUBE,
    youtube_id: ENEM_YOUTUBE_ID,
    url: ENEM_YOUTUBE,
    status: 'scheduled',
  },
  {
    title: 'Biologia — ETEC',
    description: 'Sábado 24/10, aula online da Sala 1 – ETEC, das 10:20 às 10:55 com Rômulo (B).',
    start_time: '2026-10-24T13:20:00+00:00',
    teacher_name: 'Rômulo',
    teacher_id: null,
    turmas: ['ETEC'],
    meet_link: ETEC_YOUTUBE,
    youtube_url: ETEC_YOUTUBE,
    youtube_id: ETEC_YOUTUBE_ID,
    url: ETEC_YOUTUBE,
    status: 'scheduled',
  },

  // 11:00 - 11:35 (14:00 UTC)
  {
    title: 'Redação — ENEM',
    description: 'Sábado 24/10, aula online da Sala 1 – ENEM, das 11:00 às 11:35 com Fernando (Redação).',
    start_time: '2026-10-24T14:00:00+00:00',
    teacher_name: 'Fernando',
    teacher_id: '35333018-e8e8-4a33-9f05-9a47e4d18846',
    turmas: ['ENEM'],
    meet_link: ENEM_YOUTUBE,
    youtube_url: ENEM_YOUTUBE,
    youtube_id: ENEM_YOUTUBE_ID,
    url: ENEM_YOUTUBE,
    status: 'scheduled',
  },
  {
    title: 'Língua Portuguesa — ETEC',
    description: 'Sábado 24/10, aula online da Sala 1 – ETEC, das 11:00 às 11:35 com Prô Jota (LP).',
    start_time: '2026-10-24T14:00:00+00:00',
    teacher_name: 'Prô Jota',
    teacher_id: null,
    turmas: ['ETEC'],
    meet_link: ETEC_YOUTUBE,
    youtube_url: ETEC_YOUTUBE,
    youtube_id: ETEC_YOUTUBE_ID,
    url: ETEC_YOUTUBE,
    status: 'scheduled',
  },

  // 11:40 - 12:15 (14:40 UTC)
  {
    title: 'Química — ENEM',
    description: 'Sábado 24/10, aula online da Sala 1 – ENEM, das 11:40 às 12:15 com Jorgênio (Q).',
    start_time: '2026-10-24T14:40:00+00:00',
    teacher_name: 'Jorgênio',
    teacher_id: '34ad151f-3b3e-4524-972b-32003267e180',
    turmas: ['ENEM'],
    meet_link: ENEM_YOUTUBE,
    youtube_url: ENEM_YOUTUBE,
    youtube_id: ENEM_YOUTUBE_ID,
    url: ENEM_YOUTUBE,
    status: 'scheduled',
  },
  {
    title: 'História — ETEC',
    description: 'Sábado 24/10, aula online da Sala 1 – ETEC, das 11:40 às 12:15 com Régis (H).',
    start_time: '2026-10-24T14:40:00+00:00',
    teacher_name: 'Régis',
    teacher_id: 'cfe94834-e439-4199-8de6-fc247bef0c30',
    turmas: ['ETEC'],
    meet_link: ETEC_YOUTUBE,
    youtube_url: ETEC_YOUTUBE,
    youtube_id: ETEC_YOUTUBE_ID,
    url: ETEC_YOUTUBE,
    status: 'scheduled',
  },
];

async function seedLives() {
  console.log('Seeding 12 live classes for 24 de Outubro 2026...');

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
