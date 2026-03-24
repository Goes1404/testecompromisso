
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const teachers = [
  { name: "ADRIANE RANIERI VALENTE", role: "Professora de Matemática", email: "adrianevalente@compromisso.com", subject: "Matemática" },
  { name: "Christiane Teodoro", role: "Coordenadora Pedagógica", email: "christianeteodoro@compromisso.com", subject: "Pedagogia" },
  { name: "Angelica Pastori de Araujo", role: "Professora de Geografia e Inglês para V.", email: "angelicaaraujo@compromisso.com", subject: "Geografia" },
  { name: "Joelma Vieira Barbosa", role: "Professora", email: "joelmabarbosa@compromisso.com", subject: "Geral" },
  { name: "Paulo Bezerra de Araújo", role: "Prof. Química", email: "pauloaraujo@compromisso.com", subject: "Química" },
  { name: "Francisco Pio", role: "Coordenador Pedagógico", email: "franciscopio@compromisso.com", subject: "Pedagogia" },
  { name: "Paulo Souza dos Santos", role: "Agente de Organização - Paulo", email: "paulosantos@compromisso.com", subject: "Organização" },
  { name: "Alexandre Santos de Camargo", role: "Atualidades", email: "alexandrecamargo@compromisso.com", subject: "Atualidades" },
  { name: "Valéria Bernardo da Silva", role: "Prof. Redação", email: "valeriasilva@compromisso.com", subject: "Redação" },
  { name: "Denis de Jesus Brito", role: "Apoio - Representante do Colégio", email: "denisbrito@compromisso.com", subject: "Apoio" },
  { name: "James Pio do Nascimento Seixas de Carvalho", role: "Professor de Geografia", email: "jamescarvalho@compromisso.com", subject: "Geografia" },
  { name: "Paulo Francisco Nascimento da Silva", role: "Assessor", email: "paulosilva@compromisso.com", subject: "Assessoria" },
  { name: "Régis (Reginaldo Lucindo)", role: "Prof. História/Geografia", email: "reginaldolucindo@compromisso.com", subject: "História" },
  { name: "Claudemir Amaral", role: "Professor", email: "claudemiramaral@compromisso.com", subject: "Geral" },
  { name: "Teylor Paulo Nascimento da Silva", role: "Assistente", email: "teylorsilva@compromisso.com", subject: "Assistência" },
  { name: "Pedro Henrique Alves Sampaio", role: "Prof. Física", email: "pedrosampaio@compromisso.com", subject: "Física" },
  { name: "Jessica Aparecida Miguel da Silva", role: "Psicóloga", email: "jessicasilva@compromisso.com", subject: "Psicologia" },
  { name: "Fernando Martins", role: "Professor de Redação - Língua Portuguesa", email: "fernandomartins@compromisso.com", subject: "Redação" },
  { name: "BRUNO HENRIQUE LIMA", role: "Administrador", email: "brunolima@compromisso.com", subject: "Administração" },
  { name: "Lucas Sá Teles Gonsalves", role: "Prof. Matemática", email: "lucasgonsalves@compromisso.com", subject: "Matemática" },
  { name: "Luiz Fabiano da Silva", role: "Prof. Biologia", email: "luizsilva@compromisso.com", subject: "Biologia" },
  { name: "Luiz Fabiano da Silva (Duplicado)", role: "Prof. Biologia", email: "luizfabiano@compromisso.com", subject: "Biologia" },
  { name: "Helio Fernando de Carvalho", role: "Prof. Matemática", email: "heliocarvalho@compromisso.com", subject: "Matemática" },
  { name: "ABRAHÃO COSTA DE FREITAS", role: "Prof. Literatura", email: "abrahaofreitas@compromisso.com", subject: "Literatura" },
  { name: "Selma Samira Souza Oliveira", role: "Secretaria", email: "selmaoliveira@compromisso.com", subject: "Secretaria" },
  { name: "Roger (Rogério Loureiro)", role: "Prof. Matemática", email: "rogerioloureiro@compromisso.com", subject: "Matemática" },
  { name: "Matheus Goes da Silva", role: "Equipe Técnica", email: "matheussilva@compromisso.com", subject: "Técnica" },
  { name: "Matheus Santana dos Santos", role: "VideoMaker", email: "matheussantos@compromisso.com", subject: "Vídeo" },
  { name: "Jorgenio Miranda Costa", role: "Professor Química", email: "jorgeniocosta@compromisso.com", subject: "Química" },
  { name: "Eduardo Santos Bezerra", role: "Equipe Técnica", email: "eduardobezerra@compromisso.com", subject: "Técnica" },
  { name: "Augusto Salgado", role: "Professor de História e Sociologia", email: "augustosalgado@compromisso.com", subject: "História" }
];

async function createTeacher(teacher) {
  console.log(`Processing: ${teacher.name} (${teacher.email})...`);
  
  // 1. Try to Sign Up (this works if email confirmation is disabled or if we just want to trigger it)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: teacher.email,
    password: "123456789",
    options: {
      data: { full_name: teacher.name }
    }
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
        console.log(`- User already exists in Auth. This is fine.`);
        // Note: Without service key, we can't easily get the ID here unless we have a profile already.
        // We'll try to find the profile by email if possible, but the profiles table might not have email.
        // According to our earlier inspection, profiles has 'email' column but it was null for the sample.
        return;
    }
    console.error(`- Error signing up: ${authError.message}`);
    return;
  }

  if (authData.user) {
    return finalizeProfile(authData.user.id, teacher);
  } else {
    console.log(`- SingUp triggered, but user not logged in (maybe confirmation required).`);
  }
}

async function finalizeProfile(userId, teacher) {
  // 2. Create/Update Profile
  // Note: This might fail if RLS (Row Level Security) prevents anonymus updates to other profiles.
  // But since we JUST signed up as this user, we might be able to update our own profile.
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: teacher.name,
      full_name: teacher.name,
      role: 'teacher',
      profile_type: 'teacher',
      status: 'active',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (profileError) {
    console.error(`- Error creating profile: ${profileError.message}`);
    return;
  }

  console.log(`- Profile created/updated successfully.`);

  // 3. Assign to Trails (This will likely fail due to RLS if we're not an admin)
  const { data: trails, error: trailError } = await supabase
    .from('trails')
    .select('id, title, category')
    .ilike('category', `%${teacher.subject}%`);

  if (trailError) {
    console.error(`- Error finding trails: ${trailError.message}`);
    return;
  }

  if (trails && trails.length > 0) {
    for (const trail of trails) {
      const { error: updateError } = await supabase
        .from('trails')
        .update({
          teacher_id: userId,
          teacher_name: teacher.name
        })
        .eq('id', trail.id);
      
      if (updateError) {
        console.error(`  - Error assigning to trail ${trail.title}: ${updateError.message}`);
      } else {
        console.log(`  - Assigned to trail: ${trail.title}`);
      }
    }
  }
}

async function runBatch() {
  for (const t of teachers) {
    await createTeacher(t);
  }
  console.log('Batch completed.');
}

runBatch();
