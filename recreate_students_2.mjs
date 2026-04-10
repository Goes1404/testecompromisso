import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const rawData = `Ygor A. Martins de Oliveira | ygoramartins@compromisso.com | Carlos Alberto | ENEM
Yuri SIlva de OLiveria | yurisoliveira@compromisso.com | Ricarda | ENEM
Yuri da Silva  Lima | yurislima@compromisso.com | J.k | ETEC
Allan Nogueira Guimarães da Silva | allansilva@compromisso.com | CEEJA | CEEJA
Bruno Viana de Jesus | brunojesus@compromisso.com | CEEJA | CEEJA
Camila Da Silva Lima Cândido | camilacandido@compromisso.com | CEEJA | CEEJA
Camila Lima do N. Santos | camilasantos@compromisso.com | CEEJA | CEEJA
Camila de Souza Nascimento | camilanascimento@compromisso.com | CEEJA | CEEJA
Cristina E. Silva | cristinasilva@compromisso.com | CEEJA | CEEJA
Daniel Dias De Oliveira | danieloliveira@compromisso.com | CEEJA | CEEJA
Daniela Da Silva Lima Cândido | danielalima@compromisso.com | CEEJA | CEEJA
Debora T. de Souza Machado | deboramachado@compromisso.com | CEEJA | CEEJA
Denise Ferreira Da Mota | denisemota@compromisso.com | CEEJA | CEEJA
Edna Fialho Silva Batista | ednabatista@compromisso.com | CEEJA | CEEJA
Ednamaira da Silva Alves | ednamairaalves@compromisso.com | CEEJA | CEEJA
Flavia S. de Melo | flaviamelo@compromisso.com | CEEJA | CEEJA
Gabryella Da Silva Lima Cândido | gabryellacandido@compromisso.com | CEEJA | CEEJA
Ianca K. S da Silva | iancasilva@compromisso.com | CEEJA | CEEJA
Julia Ferreira Alves | juliaalves@compromisso.com | CEEJA | CEEJA
Liliane Ribeiro De Oliveira | lilianeoliveira@compromisso.com | CEEJA | CEEJA
Lorraine A. Rosa Costa | lorrainecosta@compromisso.com | CEEJA | CEEJA
LUis P Guedes | luisguedes@compromisso.com | CEEJA | CEEJA
Maiara de Moura | maiaramoura@compromisso.com | CEEJA | CEEJA
Margarida Alves Barboza de Santana | margaridasantana@compromisso.com | CEEJA | CEEJA
Maria C. dos Santos C. de Paiva | mariapaiva@compromisso.com | CEEJA | CEEJA
Mariana Sousa Santos | marianasantos@compromisso.com | CEEJA | CEEJA
Marta Da Silva Neves | martaneves@compromisso.com | CEEJA | CEEJA
Noemi De Oliveira S Carvalho | noemicarvalho@compromisso.com | CEEJA | CEEJA
Silvana Alves dos SANTOS | silvanasantos@compromisso.com | CEEJA | CEEJA
Stephany Cristina Rodrigues P. Silva | stephanysilva@compromisso.com | CEEJA | CEEJA
Tainah Pereira | tainahpereira@compromisso.com | CEEJA | CEEJA
Yasmin dos Santos de Souza | yasminsouza@compromisso.com | CEEJA | CEEJA
Adrian F T. Velez | adrianvelez@compromisso.com | Leda Caira | ETEC
Alan da Silva Sousa | alansousa@compromisso.com | Ullysses SIlveira | ETEC
Alice Lima de Oliveira | aliceoliveira@compromisso.com | Mário Covas | ETEC
Aline M da Silva Alves | alinealves@compromisso.com | Imídeo Giuseppe | ETEC
Allicya De S. T. de Morais | allicyamorais@compromisso.com | Leda Caira | ETEC
Amanda Maria B Araujo | amandaaraujo@compromisso.com | Tom Jobim | ETEC
Ana Beatriz Neves Guedes | anaguedes@compromisso.com | Carlos Alberto | ETEC
Ana Beatriz de Sousa Taveira | anataveira@compromisso.com | Ana Aparecida | ETEC
Ana Caroliny Pereira SIlva | anasilva@compromisso.com | Ricarda | ETEC
Ana Julia Mota de Vasconcelos | anavasconcelos@compromisso.com | Aldônio | ETEC
Ana Livia V Sousa | anasousa@compromisso.com | Aldônio | ETEC
Arthur Henrique Assis | arthurassis@compromisso.com | Carlos Alberto | ETEC
Auad Daoud Abdallah | auadabdallah@compromisso.com | Leda Caira | ETEC
Breno da Costa e Cruz | brenocruz@compromisso.com | Imídeo Giuseppe | ETEC
Caio Miguel B | caiob@compromisso.com | Imídeo Giuseppe | ETEC
Cauet Ramos F Pereira | cauetpereira@compromisso.com | Leda Caira | ETEC
Davi Henrique R. Gonçalves | davigoncalves@compromisso.com | Ricarda | ETEC
Eduarda Rodrigues de Freitas | eduardafreitas@compromisso.com | Leda Caira | ETEC
Erika F. Santos Silva | erikasilva@compromisso.com | Aldônio | ETEC
Everton Da Silva Santana | evertonsantana@compromisso.com | Etec | ETEC
Fernanda G SIlva | fernandasilva@compromisso.com | Etec | ETEC
Gabriel G da S Martins | gabrielmartins@compromisso.com | Ana Aparecida | ETEC
GAbrielly C. S. Santana | gabriellysantana@compromisso.com | Ricarda | ETEC
Geovana A SIlva | geovanasilva@compromisso.com | Aldônio | ETEC
Geovane Gabriel G da Silva | geovanesilva@compromisso.com | Aldônio | ETEC
Henrique Ferreira | henriqueferreira@compromisso.com | Imídeo Giuseppe | ETEC
Inae H. Costa Souza | inaesouza@compromisso.com | Imídeo Giuseppe | ETEC
Isaac Ibiapina | isaacibiapina@compromisso.com | Paulo Botelho | ETEC
Isabela Silva dos Santos | isabelasantos@compromisso.com | Tom Jobim | ETEC
Karim M. SIlva | karimsilva@compromisso.com | Cadorna | ETEC
Kauan Alves S. Araujo | kauanaraujo@compromisso.com | Tom Jobim | ETEC
Kaue Ramos F Pereira | kauepereira@compromisso.com | Leda Caira | ETEC
Kelvin dos Santos de Sousa | kelvinsousa@compromisso.com | Imídeo Giuseppe | ETEC
Kemily de SOusa Carvalho | kemilycarvalho@compromisso.com | Ana Aparecida | ETEC
Kethelen Araujo da SIlva | kethelensilva@compromisso.com | Ana Aparecida | ETEC
Lara Duda da PIedade | larapiedade@compromisso.com | Cadorna | ETEC
Lavinia Pereira Sampaio | laviniasampaio@compromisso.com | J.k | ETEC
Letícia O. O Furtado | leticiafurtado@compromisso.com | Ana Aparecida | ETEC
Lorrayne G, Ribeiro de Lima | lorraynelima@compromisso.com | Etec | ETEC
Luciangela Soares Ferreira | luciangelaferreira@compromisso.com | Tom Jobim | ETEC
Luiza F. R. Lima | luizalima@compromisso.com | Ana Aparecida | ETEC
MAria Clara ALmeida Pinheiro | marialmeida@compromisso.com | Cadorna | ETEC
Maria Eduarda F. P. | mariafp@compromisso.com | Mário Covas | ETEC
Maria Eduarda G, Santos | mariasantos@compromisso.com | Aurélio | ETEC
Maria Eduarda S. Ferreira | mariaferreira@compromisso.com | Imídeo Giuseppe | ETEC
Maria Fernanda Pinho de Alcantara | marialcantara@compromisso.com | Paulo Botelho | ETEC
Maria Gabriela G SAntos | mariagabriela@compromisso.com | Ricarda | ETEC
Maria Heloisa de OLiveria L | mariaoliveria@compromisso.com | Colaço | ETEC
Maria Luiza Barbosa Ramos | mariabarboza@compromisso.com | Carlos Alberto | ETEC
Melyssa Alves da SIlva | melyssasilva@compromisso.com | Mário Covas | ETEC
Mikaelly C. de Queiroz Oliveira | mikaellyoliveira@compromisso.com | Carlos Alberto | ETEC
Nathalia Pereira de Oliveira | nathaliaoliveira@compromisso.com | Ana Aparecida | ETEC
Niccolas Vieira Araujo Silva | niccolassilva@compromisso.com | Mário Covas | ETEC
Nicole Ribeiro M. Costa | nicolecosta@compromisso.com | Paulo Botelho | ETEC
Nicoly da S. de Sousa | nicolysousa@compromisso.com | Ricarda | ETEC
Paulo V. F Assis | pauloassis@compromisso.com | Aldônio | ETEC
Pietro A F Bezerra | pietrobezerra@compromisso.com | Imídeo Giuseppe | ETEC
Raphaelly Almeida N da Silva | raphaellysilva@compromisso.com | Leda Caira | ETEC
Rayssa R Moreira | rayssamoreira@compromisso.com | Ricarda | ETEC
Rebeca Pires Oliveira | rebecaoliveira@compromisso.com | Mário Covas | ETEC
Roberta Avelino da SIlva | robertasilva@compromisso.com | Ullysses SIlveira | ETEC
Talita de Oliveira T de M | talitam@compromisso.com | Cadorna | ETEC
Witoria Guedes De Santana | witoriasantana@compromisso.com | Ricarda | ETEC
Yasmin Oliveira P. dos Santos | yasminoliveira@compromisso.com | Ricarda | ETEC
Yudi O. de França | yudifranca@compromisso.com | Leda Caira | ETEC`;

async function main() {
  console.log("Starting bulk recreation process from raw string pt 2...");
  
  const lines = rawData.split('\n').filter(l => l.trim().length > 0);
  console.log('Total students to import in Part 2: ' + lines.length);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const line of lines) {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 4) continue;
      
      const [name, email, school, profileType] = parts;
      const cleanEmail = email.toLowerCase();
      
      try {
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email: cleanEmail,
              password: 'compromisso2026',
              email_confirm: true,
              user_metadata: {
                  full_name: name,
                  role: 'student',
                  profile_type: 'student',
                  school: school,
                  study_focus: profileType,
                  must_change_password: false // per requirements
              }
          });
          
          if (createError) {
              if (createError.message.includes("User already registered")) {
                  // already added
              } else {
                  console.error('Failed to recreate ' + email + ': ' + createError.message);
                  failCount++;
              }
              continue;
          }
          
          // Try inserting profile
          if (newUser.user) {
              const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
                  id: newUser.user.id,
                  email: cleanEmail,
                  full_name: name,
                  name: name,
                  role: 'student',
                  status: 'active',
                  institution: school,
                  exam_target: profileType
              }, { onConflict: 'id' });
              
              if (profileError) {
                  console.error('Profile insert error for ' + email + ': ' + profileError.message);
              }
          }
          
          successCount++;
          if (successCount % 20 === 0) {
              console.log('Imported ' + successCount + ' students...');
          }
      } catch (e) {
          console.error('Exception processing ' + email + ':', e);
          failCount++;
      }
  }
  
  console.log('Recreation pt 2 summary - Success: ' + successCount + ', Failed: ' + failCount);
  console.log('Done Part 2.');
}

main().catch(console.error);
