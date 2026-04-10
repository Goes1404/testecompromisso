import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const data = `adrianervalente@compromisso.com	Professora de Matemática
christianeteodoro@compromisso.com	Coordenadora Pedagógica
angelicaparaujo@compromisso.com	Professora de Geografia e Inglês para V.
joelmavbarbosa@compromisso.com	Professora
paulobaraujo@compromisso.com	Prof. Química
franciscopio@compromisso.com	Coordenador Pedagógico
paulossantos@compromisso.com	Agente de Organização
alexandrescamargo@compromisso.com	Atualidades
valeriabsilva@compromisso.com	Prof. Redação
denisjbrito@compromisso.com	Apoio - Representante do Colégio
jamespcarvalho@compromisso.com	Professor de Geografia
paulofsilva@compromisso.com	Assessor
reginaldolucindo@compromisso.com	Prof. História/Geografia
claudemiramaral@compromisso.com	Professor
teylorpsilva@compromisso.com	Assistente
pedrohsampaio@compromisso.com	Prof. Física
jessicaasilva@compromisso.com	Psicóloga
fernandomartins@compromisso.com	Professor de Redação - Língua Portuguesa
brunohlima@compromisso.com	Administrador
lucassgonsalves@compromisso.com	Prof. Matemática
luizfsilva@compromisso.com	Prof. Biologia
heliofcarvalho@compromisso.com	Prof. Matemática
abrahaocfreitas@compromisso.com	Prof. Literatura
selmasoliveira@compromisso.com	Secretaria
rogerioloureiro@compromisso.com	Prof. Matemática
matheusgsilva@compromisso.com	Equipe Técnica
matheusssantos@compromisso.com	VideoMaker
jorgeniomcosta@compromisso.com	Professor Química
eduardosbezerra@compromisso.com	Equipe Técnica
augustosalgado@compromisso.com	Professor de História e Sociologia`;

function parseName(email) {
  const prefix = email.split('@')[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getAllUsers() {
   let allUsers = [];
   let page = 1;
   while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page: page, perPage: 1000 });
      if (error) {
         console.error('Error fetching users:', error);
         break;
      }
      if (!data.users || data.users.length === 0) break;
      allUsers = allUsers.concat(data.users);
      page++;
      await sleep(200);
   }
   return allUsers;
}

async function update() {
  const allUsers = await getAllUsers();
  console.log('Total auth users:', allUsers.length);
  
  const lines = data.trim().split('\n');
  for (const line of lines) {
    const [email, func] = line.split('\t');
    const role = (func.toLowerCase().includes('coordenador') || func.toLowerCase().includes('administrador')) ? 'admin' : 'teacher';
    const name = parseName(email);

    let user = allUsers.find(u => u.email === email);
    
    if (!user) {
       console.log('Creating auth user:', email);
       const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: email,
          password: 'compromisso2026',
          email_confirm: true,
          user_metadata: { role: role, name: name }
       });
       if (createErr) {
          console.log('Error creating', email, createErr);
       } else {
          user = newUser.user;
       }
    } else {
       await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: { role: role, name: name },
          password: 'compromisso2026'
       });
    }
    
    if (user) {
       console.log('Updating profile for', email);
       // Wait a bit to avoid conflicting with auth trigger and to avoid rate limits
       await sleep(500); 
       const { error: pErr } = await supabase.from('profiles').upsert({
           id: user.id,
           email: email,
           name: user.user_metadata?.name || name,
           role: role,
           profile_type: func,
           status: 'active'
       });
       
       if (pErr) console.log('Error updating profile for', email, pErr);
       else console.log('Successfully provisioned', email, 'as', func, '(', role, ')');
    }
    await sleep(200);
  }
}

update();
