/**
 * fix-encoding.mjs — Corrige mojibake UTF-8 nas questões ENEM já inseridas
 *
 * O problema: PowerShell 5.1 decodificou a resposta HTTP como Windows-1252
 * em vez de UTF-8. Bytes UTF-8 de "ç" (C3 A7) viraram os chars Latin-1 "Ã§".
 *
 * A correção: Buffer.from(str, 'latin1').toString('utf8') converte cada char
 * Latin-1 de volta ao byte original, depois decodifica como UTF-8 corretamente.
 *
 * Uso: NODE_TLS_REJECT_UNAUTHORIZED=0 node --env-file=.env.local fix-encoding.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fixMojibake(str) {
  if (!str || typeof str !== 'string') return str;
  return Buffer.from(str, 'latin1').toString('utf8');
}

// Detecta se o texto tem o padrão clássico de mojibake UTF-8→Latin-1
// Ex: "ç" vira "Ã§", "ã" vira "Ã£", "é" vira "Ã©"
function hasMojibake(str) {
  if (!str) return false;
  return /Ã[\x80-\xBF]/.test(Buffer.from(str, 'latin1').toString('binary'));
}

// Versão mais simples e confiável: procura sequências típicas de mojibake
function needsFix(str) {
  if (!str) return false;
  // Ã seguido de chars comuns do Latin-1 upper range = sinal forte de mojibake
  return /Ã[§£¡©¨ªº¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþ°±¼½¾²³µ¶·¸¹»«¬­®¯]/.test(str);
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Env ausente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`🔗 ${SUPABASE_URL}`);
  console.log('🔧 Buscando questões ENEM com encoding corrompido...\n');

  const PAGE = 100;
  let offset = 0;
  let totalChecked = 0;
  let totalFixed = 0;
  let totalErrors = 0;

  while (true) {
    const { data: questions, error } = await db
      .from('questions')
      .select('id, question_text, supporting_text, options')
      .eq('target_audience', 'enem')
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error('\n❌ Erro ao buscar questões:', error.message);
      break;
    }
    if (!questions || questions.length === 0) break;

    for (const q of questions) {
      totalChecked++;

      const qtNeedsFix = needsFix(q.question_text);
      const stNeedsFix = needsFix(q.supporting_text);
      const optsNeedFix = (q.options ?? []).some(o => needsFix(o.text));

      if (!qtNeedsFix && !stNeedsFix && !optsNeedFix) continue;

      const update = {};
      if (qtNeedsFix) update.question_text = fixMojibake(q.question_text);
      if (stNeedsFix)  update.supporting_text = fixMojibake(q.supporting_text);
      if (optsNeedFix) {
        update.options = (q.options ?? []).map(o => ({
          ...o,
          text: needsFix(o.text) ? fixMojibake(o.text) : o.text,
        }));
      }

      const { error: updErr } = await db
        .from('questions')
        .update(update)
        .eq('id', q.id);

      if (updErr) {
        totalErrors++;
        if (totalErrors <= 5) console.error(`\n  ⚠ ${q.id}: ${updErr.message}`);
      } else {
        totalFixed++;
      }
    }

    process.stdout.write(`  verificadas: ${totalChecked} | corrigidas: ${totalFixed} | erros: ${totalErrors}\r`);

    if (questions.length < PAGE) break;
    offset += PAGE;
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n\n✅ Concluído!`);
  console.log(`   Verificadas : ${totalChecked}`);
  console.log(`   Corrigidas  : ${totalFixed}`);
  console.log(`   Erros       : ${totalErrors}\n`);
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
