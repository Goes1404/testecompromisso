/**
 * update-trail-images.mjs — Atualiza as capas das trilhas com imagens do Pixabay
 *
 * Busca todas as trilhas sem capa (ou com picsum.photos) e pesquisa uma
 * imagem relevante no Pixabay com base no título e na categoria de cada trilha.
 *
 * Pré-requisito:
 *   Adicione ao .env.local:
 *     PIXABAY_API_KEY=sua_chave_aqui
 *   (crie grátis em https://pixabay.com/api/docs/)
 *
 * Uso:
 *   Preview (sem alterar nada):
 *     node --env-file=.env.local update-trail-images.mjs --dry-run
 *
 *   Executar de verdade:
 *     NODE_TLS_REJECT_UNAUTHORIZED=0 node --env-file=.env.local update-trail-images.mjs
 *
 *   Forçar atualização mesmo de trilhas que já têm imagem:
 *     NODE_TLS_REJECT_UNAUTHORIZED=0 node --env-file=.env.local update-trail-images.mjs --force
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PIXABAY_KEY = process.env.PIXABAY_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

const CATEGORY_KEYWORDS = {
  'Matemática': 'mathematics education',
  'Física': 'physics science',
  'Química': 'chemistry laboratory',
  'Biologia': 'biology nature science',
  'História': 'history education ancient',
  'Geografia': 'geography world map',
  'Português': 'language books reading',
  'Linguagens': 'language arts literature',
  'Literatura': 'literature books',
  'Filosofia': 'philosophy thinking',
  'Sociologia': 'sociology society people',
  'Atualidades': 'current events news',
};

function buildQuery(title, category) {
  const categoryBase = CATEGORY_KEYWORDS[category] ?? category ?? '';
  const cleanTitle = title
    .replace(/^aula\s+\d+\s*[-–:]\s*/i, '')
    .replace(/^exercícios?\s+da\s+aula\s+\d+\s*/i, 'exercises ')
    .replace(/^introdução\s+a[o]?\s+/i, '')
    .replace(/pt\.\s*\d+/i, '')
    .trim()
    .slice(0, 40);
  return `${categoryBase} ${cleanTitle}`.trim();
}

async function searchImage(query) {
  const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=5&safesearch=true&min_width=800`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pixabay HTTP ${res.status}`);
  const data = await res.json();
  const hits = data.hits ?? [];
  if (hits.length === 0) return null;
  // pega aleatório dos top 5 para variedade
  return hits[Math.floor(Math.random() * hits.length)].largeImageURL;
}

function needsUpdate(trail) {
  if (FORCE) return true;
  if (!trail.image_url) return true;
  if (trail.image_url.includes('picsum.photos')) return true;
  return false;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Env ausente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!PIXABAY_KEY) {
    console.error('❌ Env ausente: PIXABAY_API_KEY');
    console.error('   Crie uma chave grátis em https://pixabay.com/api/docs/');
    process.exit(1);
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (DRY_RUN) console.log('🔍 MODO DRY-RUN — nenhuma alteração será feita\n');
  if (FORCE) console.log('⚡ MODO FORCE — atualiza todas, mesmo com imagem existente\n');
  console.log(`🔗 ${SUPABASE_URL}\n`);

  const { data: trails, error } = await db
    .from('trails')
    .select('id, title, category, image_url')
    .order('created_at');

  if (error) { console.error('❌ Erro ao buscar trilhas:', error.message); process.exit(1); }
  console.log(`📚 ${trails.length} trilha(s) encontrada(s)\n`);

  const toUpdate = trails.filter(needsUpdate);
  const skipped = trails.length - toUpdate.length;

  console.log(`🖼  ${toUpdate.length} com imagem a buscar   |   ⏭ ${skipped} já têm imagem personalizada\n`);

  let updated = 0;
  let failed = 0;

  for (const trail of toUpdate) {
    const query = buildQuery(trail.title, trail.category);
    process.stdout.write(`  📸 "${trail.title}" → "${query}" ... `);

    if (DRY_RUN) {
      console.log('(dry-run)');
      updated++;
      continue;
    }

    try {
      const imageUrl = await searchImage(query);
      if (!imageUrl) {
        console.log('⚠ sem resultado');
        failed++;
      } else {
        const { error: updErr } = await db
          .from('trails')
          .update({ image_url: imageUrl })
          .eq('id', trail.id);

        if (updErr) {
          console.log(`❌ ${updErr.message}`);
          failed++;
        } else {
          console.log('✓');
          updated++;
        }
      }
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }

    // Respeita rate limit do Pixabay (200 req/hora = ~3.3 req/s)
    await sleep(400);
  }

  console.log('\n' + '─'.repeat(50));
  if (DRY_RUN) {
    console.log('🔍 RESULTADO DRY-RUN (nenhuma alteração foi feita):');
  } else {
    console.log('✅ ATUALIZAÇÃO CONCLUÍDA:');
  }
  console.log(`   Trilhas atualizadas  : ${updated}`);
  console.log(`   Sem resultado        : ${failed}`);
  console.log(`   Já tinham imagem     : ${skipped}`);
  if (failed > 0) console.log('\n⚠ Verifique os erros acima. Tente --force para reprocessar.');
  console.log('');
}

main().catch(err => { console.error('❌ Erro fatal:', err.message); process.exit(1); });
