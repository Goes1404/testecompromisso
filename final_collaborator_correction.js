import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const collaborators = [
  { name: "ADRIANE RANIERI VALENTE", role: "teacher", subject: "Professora de Matemática", email: "adrianevalente@compromisso.com" },
  { name: "Christiane Teodoro", role: "admin", subject: "Coordenadora Pedagógica", email: "christianeteodoro@compromisso.com" },
  { name: "Angelica Pastori de Araujo", role: "teacher", subject: "Professora de Geografia e Inglês para V.", email: "angelicaaraujo@compromisso.com" },
  { name: "Joelma Vieira Barbosa", role: "teacher", subject: "Professora", email: "joelmabarbosa@compromisso.com" },
  { name: "Paulo Bezerra de Araújo", role: "teacher", subject: "Prof. Química", email: "pauloaraujo@compromisso.com" },
  { name: "Francisco Pio", role: "admin", subject: "Coordenador Pedagógico", email: "franciscopio@compromisso.com" },
  { name: "Paulo Souza dos Santos", role: "teacher", subject: "Agente de Organização - Paulo", email: "paulosantos@compromisso.com" },
  { name: "Alexandre Santos de Camargo", role: "teacher", subject: "Atualidades", email: "alexandrecamargo@compromisso.com" },
  { name: "Valéria Bernardo da Silva", role: "teacher", subject: "Prof. Redação", email: "valeriasilva@compromisso.com" },
  { name: "Denis de Jesus Brito", role: "teacher", subject: "Apoio - Representante do Colégio", email: "denisbrito@compromisso.com" },
  { name: "James Pio do Nascimento Seixas de Carvalho", role: "teacher", subject: "Professor de Geografia", email: "jamescarvalho@compromisso.com" },
  { name: "Paulo Francisco Nascimento da Silva", role: "teacher", subject: "Assessor", email: "paulosilva@compromisso.com" },
  { name: "Régis (Reginaldo Lucindo)", role: "teacher", subject: "Prof. História/Geografia", email: "reginaldolucindo@compromisso.com" },
  { name: "Claudemir Amaral", role: "teacher", subject: "Professor", email: "claudemiramaral@compromisso.com" },
  { name: "Teylor Paulo Nascimento da Silva", role: "teacher", subject: "Assistente", email: "teylorsilva@compromisso.com" },
  { name: "Pedro Henrique Alves Sampaio", role: "teacher", subject: "Prof. Física", email: "pedrosampaio@compromisso.com" },
  { name: "Jessica Aparecida Miguel da Silva", role: "teacher", subject: "Psicóloga", email: "jessicasilva@compromisso.com" },
  { name: "Fernando Martins", role: "teacher", subject: "Professor de Redação - Língua Portuguesa", email: "fernandomartins@compromisso.com" },
  { name: "BRUNO HENRIQUE LIMA", role: "admin", subject: "Administrador", email: "brunolima@compromisso.com" },
  { name: "Lucas Sá Teles Gonsalves", role: "teacher", subject: "Prof. Matemática", email: "lucasgonsalves@compromisso.com" },
  { name: "Luiz Fabiano da Silva", role: "teacher", subject: "Prof. Biologia", email: "luizsilva@compromisso.com" },
  { name: "Luiz Fabiano da Silva (Duplicado)", role: "teacher", subject: "Prof. Biologia", email: "luizfabiano@compromisso.com" },
  { name: "Helio Fernando de Carvalho", role: "teacher", subject: "Prof. Matemática", email: "heliocarvalho@compromisso.com" },
  { name: "ABRAHÃO COSTA DE FREITAS", role: "teacher", subject: "Prof. Literatura", email: "abrahaofreitas@compromisso.com" },
  { name: "Selma Samira Souza Oliveira", role: "teacher", subject: "Secretaria", email: "selmaoliveira@compromisso.com" },
  { name: "Roger (Rogério Loureiro)", role: "teacher", subject: "Prof. Matemática", email: "rogerioloureiro@compromisso.com" },
  { name: "Matheus Goes da Silva", role: "teacher", subject: "Equipe Técnica", email: "matheussilva@compromisso.com" },
  { name: "Matheus Santana dos Santos", role: "teacher", subject: "VideoMaker", email: "matheussantos@compromisso.com" },
  { name: "Jorgenio Miranda Costa", role: "teacher", subject: "Professor Química", email: "jorgeniocosta@compromisso.com" },
  { name: "Eduardo Santos Bezerra", role: "admin", subject: "Equipe Técnica", email: "eduardobezerra@compromisso.com" },
  { name: "Augusto Salgado", role: "teacher", subject: "Professor de História e Sociologia", email: "augustosalgado@compromisso.com" }
]

async function ultimateFix() {
  console.log('🛡️ INICIANDO CORREÇÃO FINAL DOS COLABORADORES 🛡️')
  
  const tempPassword = 'compromisso2026'

  for (const c of collaborators) {
    const email = c.email.toLowerCase().trim()
    console.log(`\n--- Processando: ${email} ---`)

    try {
      // 1. Limpeza total de registros "fantasmas" no Profiles
      await supabase.from('profiles').delete().ilike('email', email)
      
      // 2. Limpeza no Auth
      const { data: { users } } = await supabase.auth.admin.listUsers({perPage: 1000})
      const existing = users.find(u => u.email.toLowerCase() === email)
      if (existing) {
        console.log(`  - Deletando usuário Auth existente: ${existing.id}`)
        await supabase.auth.admin.deleteUser(existing.id)
      }

      // 3. Criação Fresh
      // IMPORTANTE: metadata role DEVE ser o enum ('teacher' ou 'admin')
      const { data: auth, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          display_name: c.name,
          full_name: c.name,
          role: c.role, // AGORA É O VALOR VÁLIDO (teacher/admin)
          subject_name: c.subject, // Nome descritivo da matéria
          must_change_password: true
        }
      })

      if (authError) {
        console.error(`  ❌ ERRO AUTH: ${authError.message}`)
        continue
      }

      const userId = auth.user.id
      console.log(`  ✅ Auth Criado: ${userId}`)

      // 4. Inserção Manual no Profiles (Bypass trigger just in case)
      const { error: profError } = await supabase.from('profiles').upsert({
        id: userId,
        email,
        name: c.name,
        profile_type: c.role,
        role: c.role,
        course: c.subject, // Matéria vai para o campo 'course' que é texto
        institution: 'Colégio Compromisso',
        status: 'active'
      })

      if (profError) {
        console.error(`  ❌ ERRO PERFIL: ${profError.message}`)
      } else {
        console.log(`  ✅ Perfil Sincronizado com Matéria: ${c.subject}`)
      }

    } catch (err) {
      console.error(`  💥 ERRO INESPERADO: ${err.message}`)
    }
  }

  console.log('\n✅ TODOS OS COLABORADORES FORAM RESETADOS E CORRIGIDOS!')
}

ultimateFix()
 Richmond: 2228
