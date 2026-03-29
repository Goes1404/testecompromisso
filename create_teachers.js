
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
  // Padronização de Nome e E-mail
  const nameParts = teacher.name.trim().split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  const displayName = `${firstName} ${lastName}`;
  
  const formattedEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "") + "@compromisso.com";

  console.log(`Processing: ${displayName} (${formattedEmail})...`);
  
  // 1. Create User in Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: formattedEmail,
    password: "compromisso2026",
    email_confirm: true,
    user_metadata: { 
      full_name: displayName,
      must_change_password: true,
      role: 'teacher'
    }
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
        console.log(`- User already exists in Auth. Fetching profile...`);
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        const existingUser = users.users.find(u => u.email === formattedEmail);
        if (!existingUser) throw new Error("User exists but not found in list");
        
        // Update existing user to have the correct metadata if needed
        await supabase.auth.admin.updateUserById(existingUser.id, {
            user_metadata: { ...existingUser.user_metadata, full_name: displayName, role: 'teacher' }
        });
        
        return finalizeProfile(existingUser.id, teacher, displayName);
    }
    console.error(`- Error creating auth user: ${authError.message}`);
    return;
  }

  return finalizeProfile(authData.user.id, teacher, displayName);
}

async function finalizeProfile(userId, teacher, displayName) {
  // 2. Create/Update Profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: displayName,
      email: teacher.email, // Mantemos o email original no profile para referência ou usamos o novo? 
      // O usuário disse: "para os professores que ja entraram e colocaram a senha deles, mantenha o email normal. apenas registre eles no banco de dados e coloque o nome de exibição correto"
      profile_type: 'teacher',
      status: 'active',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (profileError) {
    console.error(`- Error creating profile: ${profileError.message}`);
    return;
  }

  console.log(`- Profile created/updated successfully.`);

  // 3. Assign to Trails
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
          teacher_name: displayName
        })
        .eq('id', trail.id);
      
      if (updateError) {
        console.error(`  - Error assigning to trail ${trail.title}: ${updateError.message}`);
      } else {
        console.log(`  - Assigned to trail: ${trail.title}`);
      }
    }
  } else {
    console.log(`  - No matching trails found for subject: ${teacher.subject}`);
  }
}

async function runBatch() {
  for (const t of teachers) {
    try {
      await createTeacher(t);
    } catch (e) {
      console.error(`Unexpected error for ${t.name}:`, e.message);
    }
  }
  console.log('Batch completed.');
}

runBatch();
