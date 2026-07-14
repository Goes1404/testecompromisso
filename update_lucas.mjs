import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qjdcexrirortchemezij.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZGNleHJpcm9ydGNoZW1lemlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM4ODQzOSwiZXhwIjoyMDg1OTY0NDM5fQ.vWXpOAs-T1WP20ERdZnRpFS81eKnzHPO-zUML5BL--o';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLucas() {
  console.log('Buscando Lucas Costa Barbalarga...');

  // Busca por "barbalarga" (parte mais única do nome)
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('name', '%barbalarga%');

  if (fetchError) {
    console.error('Erro ao buscar perfil:', fetchError);

    // Tenta por full_name
    const { data: byFull, error: err2 } = await supabase
      .from('profiles')
      .select('*')
      .ilike('full_name', '%barbalarga%');

    if (err2 || !byFull || byFull.length === 0) {
      console.log('Tentando por "lucas costa"...');
      const { data: byLucas } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%lucas%costa%');

      if (!byLucas || byLucas.length === 0) {
        console.error('Aluno não encontrado.');
        return;
      }
      byLucas.forEach(p => console.log(` - ${p.full_name} | ${p.email} | ID: ${p.id}`));
      if (byLucas.length === 1) await doUpdate(byLucas[0]);
      return;
    }

    byFull.forEach(p => console.log(` - ${p.full_name} | ${p.email} | ID: ${p.id}`));
    if (byFull.length === 1) await doUpdate(byFull[0]);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('Não encontrado por "barbalarga". Tentando por "lucas costa"...');

    const { data: profiles2, error: err2 } = await supabase
      .from('profiles')
      .select('*')
      .ilike('name', '%lucas%costa%');

    if (err2 || !profiles2 || profiles2.length === 0) {
      console.error('Aluno não encontrado.');
      return;
    }

    profiles2.forEach(p => console.log(` - ${p.name} | ${p.email} | ID: ${p.id}`));
    if (profiles2.length === 1) await doUpdate(profiles2[0]);
    return;
  }

  console.log(`Encontrado: ${profiles[0].name} | Email: ${profiles[0].email} | ID: ${profiles[0].id}`);
  await doUpdate(profiles[0]);
}

async function doUpdate(profile) {
  console.log(`\nAtualizando perfil de ${profile.name || profile.full_name}...`);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      sala: 'sala 8',
      exam_target: 'ENEM',
      course: 'ENEM',
      institution: 'Aldonio',
    })
    .eq('id', profile.id);

  if (updateError) {
    console.error('Erro ao atualizar perfil:', updateError);
    return;
  }

  console.log('\n✅ Perfil atualizado com sucesso!');
  console.log('   Nome: Lucas Costa Barbalarga');
  console.log('   Sala: 08');
  console.log('   Objetivo: ENEM');
  console.log('   Escola: Aldonio');
}

updateLucas();
