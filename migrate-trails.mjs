/**
 * migrate-trails.mjs — Expande cada learning_content em uma trilha standalone
 *
 * Cada videoaula/conteúdo que estava agrupado num único módulo de uma trilha
 * vira sua própria trilha individual, preservando categoria, professor e status.
 * As trilhas originais são deletadas ao final (CASCADE remove módulos vazios).
 *
 * Uso:
 *   Preview (sem alterar nada):
 *     node --env-file=.env.local migrate-trails.mjs --dry-run
 *
 *   Executar de verdade:
 *     NODE_TLS_REJECT_UNAUTHORIZED=0 node --env-file=.env.local migrate-trails.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Env ausente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (DRY_RUN) console.log('🔍 MODO DRY-RUN — nenhuma alteração será feita\n');
  console.log(`🔗 ${SUPABASE_URL}\n`);

  // 1. Buscar todas as trilhas
  const { data: trails, error: trailsErr } = await db
    .from('trails')
    .select('id, title, category, teacher_id, teacher_name, status, target_audience, image_url')
    .order('created_at');

  if (trailsErr) { console.error('❌ Erro ao buscar trilhas:', trailsErr.message); process.exit(1); }
  console.log(`📚 ${trails.length} trilha(s) encontrada(s)\n`);

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalDeleted = 0;
  let totalErrors = 0;

  for (const trail of trails) {
    // 2. Buscar módulos da trilha
    const { data: modules, error: modErr } = await db
      .from('modules')
      .select('id, title')
      .eq('trail_id', trail.id);

    if (modErr) {
      console.error(`  ⚠ Módulos de "${trail.title}": ${modErr.message}`);
      totalErrors++;
      continue;
    }

    if (!modules || modules.length === 0) {
      console.log(`  ⏭ "${trail.title}" — sem módulos, ignorada`);
      totalSkipped++;
      continue;
    }

    // 3. Buscar todos os learning_contents dos módulos desta trilha
    const moduleIds = modules.map(m => m.id);
    const { data: contents, error: contErr } = await db
      .from('learning_contents')
      .select('id, title, type, url, description, order_index, workbook_id, module_id')
      .in('module_id', moduleIds)
      .order('order_index');

    if (contErr) {
      console.error(`  ⚠ Conteúdos de "${trail.title}": ${contErr.message}`);
      totalErrors++;
      continue;
    }

    if (!contents || contents.length === 0) {
      console.log(`  ⏭ "${trail.title}" — sem conteúdos, ignorada`);
      totalSkipped++;
      continue;
    }

    console.log(`\n📂 "${trail.title}" [${trail.category}] — ${contents.length} conteúdo(s)`);

    // 4. Para cada learning_content, criar nova trail standalone
    let trailOk = true;
    for (const content of contents) {
      const label = `    → "${content.title}" (${content.type})`;

      if (DRY_RUN) {
        console.log(`${label} ✓ (dry-run)`);
        totalCreated++;
        continue;
      }

      // 4a. Criar nova trail
      const { data: newTrail, error: newTrailErr } = await db
        .from('trails')
        .insert({
          title: content.title,
          category: trail.category,
          teacher_id: trail.teacher_id,
          teacher_name: trail.teacher_name,
          status: trail.status,
          target_audience: trail.target_audience,
          image_url: trail.image_url,
        })
        .select('id')
        .single();

      if (newTrailErr || !newTrail) {
        console.error(`${label} ❌ Trail: ${newTrailErr?.message}`);
        totalErrors++;
        trailOk = false;
        continue;
      }

      // 4b. Criar módulo na nova trail
      const { data: newModule, error: newModErr } = await db
        .from('modules')
        .insert({ trail_id: newTrail.id, title: 'Conteúdo', order_index: 1 })
        .select('id')
        .single();

      if (newModErr || !newModule) {
        console.error(`${label} ❌ Módulo: ${newModErr?.message}`);
        // Limpar trail criada órfã
        await db.from('trails').delete().eq('id', newTrail.id);
        totalErrors++;
        trailOk = false;
        continue;
      }

      // 4c. Atualizar learning_content para apontar ao novo módulo
      const { error: updateErr } = await db
        .from('learning_contents')
        .update({ module_id: newModule.id })
        .eq('id', content.id);

      if (updateErr) {
        console.error(`${label} ❌ Update: ${updateErr.message}`);
        // Limpar trail e módulo órfãos
        await db.from('trails').delete().eq('id', newTrail.id);
        totalErrors++;
        trailOk = false;
        continue;
      }

      console.log(`${label} ✓`);
      totalCreated++;
    }

    // 5. Deletar trilha original (CASCADE remove módulos agora vazios)
    if (!DRY_RUN && trailOk) {
      const { error: delErr } = await db
        .from('trails')
        .delete()
        .eq('id', trail.id);

      if (delErr) {
        console.error(`  ❌ Falha ao deletar trilha original "${trail.title}": ${delErr.message}`);
        totalErrors++;
      } else {
        console.log(`  🗑 Trilha original "${trail.title}" removida`);
        totalDeleted++;
      }
    } else if (DRY_RUN) {
      console.log(`  🗑 Trilha original "${trail.title}" seria deletada (dry-run)`);
      totalDeleted++;
    }
  }

  console.log('\n' + '─'.repeat(50));
  if (DRY_RUN) {
    console.log('🔍 RESULTADO DRY-RUN (nenhuma alteração foi feita):');
  } else {
    console.log('✅ MIGRAÇÃO CONCLUÍDA:');
  }
  console.log(`   Trilhas originais removidas : ${totalDeleted}`);
  console.log(`   Novas trilhas criadas        : ${totalCreated}`);
  console.log(`   Ignoradas (sem conteúdo)     : ${totalSkipped}`);
  console.log(`   Erros                        : ${totalErrors}`);
  if (totalErrors > 0) console.log('\n⚠ Verifique os erros acima antes de continuar.');
  console.log('');
}

main().catch(err => { console.error('❌ Erro fatal:', err.message); process.exit(1); });
