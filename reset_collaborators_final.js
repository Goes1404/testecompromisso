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
  { name: "ADRIANE RANIERI VALENTE", role: "Professora de Matemática", email: "adrianevalente@compromisso.com" },
  { name: "Christiane Teodoro", role: "Coordenadora Pedagógica", email: "christianeteodoro@compromisso.com" },
  { name: "Angelica Pastori de Araujo", role: "Professora de Geografia e Inglês para V.", email: "angelicaaraujo@compromisso.com" },
  { name: "Joelma Vieira Barbosa", role: "Professora", email: "joelmabarbosa@compromisso.com" },
  { name: "Paulo Bezerra de Araújo", role: "Prof. Química", email: "pauloaraujo@compromisso.com" },
  { name: "Francisco Pio", role: "Coordenador Pedagógico", email: "franciscopio@compromisso.com" },
  { name: "Paulo Souza dos Santos", role: "Agente de Organização - Paulo", email: "paulosantos@compromisso.com" },
  { name: "Alexandre Santos de Camargo", role: "Atualidades", email: "alexandrecamargo@compromisso.com" },
  { name: "Valéria Bernardo da Silva", role: "Prof. Redação", email: "valeriasilva@compromisso.com" },
  { name: "Denis de Jesus Brito", role: "Apoio - Representante do Colégio", email: "denisbrito@compromisso.com" },
  { name: "James Pio do Nascimento Seixas de Carvalho", role: "Professor de Geografia", email: "jamescarvalho@compromisso.com" },
  { name: "Paulo Francisco Nascimento da Silva", role: "Assessor", email: "paulosilva@compromisso.com" },
  { name: "Régis (Reginaldo Lucindo)", role: "Prof. História/Geografia", email: "reginaldolucindo@compromisso.com" },
  { name: "Claudemir Amaral", role: "Professor", email: "claudemiramaral@compromisso.com" },
  { name: "Teylor Paulo Nascimento da Silva", role: "Assistente", email: "teylorsilva@compromisso.com" },
  { name: "Pedro Henrique Alves Sampaio", role: "Prof. Física", email: "pedrosampaio@compromisso.com" },
  { name: "Jessica Aparecida Miguel da Silva", role: "Psicóloga", email: "jessicasilva@compromisso.com" },
  { name: "Fernando Martins", role: "Professor de Redação - Língua Portuguesa", email: "fernandomartins@compromisso.com" },
  { name: "BRUNO HENRIQUE LIMA", role: "Administrador", email: "brunolima@compromisso.com" },
  { name: "Lucas Sá Teles Gonsalves", role: "Prof. Matemática", email: "lucasgonsalves@compromisso.com" },
  { name: "Luiz Fabiano da Silva (1)", role: "Prof. Biologia", email: "luizsilva@compromisso.com" },
  { name: "Luiz Fabiano da Silva (2)", role: "Prof. Biologia", email: "luizfabiano@compromisso.com" },
  { name: "Helio Fernando de Carvalho", role: "Prof. Matemática", email: "heliocarvalho@compromisso.com" },
  { name: "ABRAHÃO COSTA DE FREITAS", role: "Prof. Literatura", email: "abrahaofreitas@compromisso.com" },
  { name: "Selma Samira Souza Oliveira", role: "Secretaria", email: "selmaoliveira@compromisso.com" },
  { name: "Roger (Rogério Loureiro)", role: "Prof. Matemática", email: "rogerioloureiro@compromisso.com" },
  { name: "Matheus Goes da Silva", role: "Equipe Técnica", email: "matheussilva@compromisso.com" },
  { name: "Matheus Santana dos Santos", role: "VideoMaker", email: "matheussantos@compromisso.com" },
  { name: "Jorgenio Miranda Costa", role: "Professor Química", email: "jorgeniocosta@compromisso.com" },
  { name: "Eduardo Santos Bezerra", role: "Equipe Técnica", email: "eduardobezerra@compromisso.com" },
  { name: "Augusto Salgado", role: "Professor de História e Sociologia", email: "augustosalgado@compromisso.com" }
]

async function resetAndCreateCollaborators() {
  console.log('🔥 INICIANDO RESET TOTAL DE COLABORADORES 🔥')
  
  const tempPassword = 'compromisso2026'

  for (const c of collaborators) {
    const email = c.email.toLowerCase().trim()
    console.log(`\n---------------------------------`)
    console.log(`Processando: ${c.name} (${email})`)

    try {
      // 1. LIMPEZA TOTAL (AUTH & PROFILE)
      // Procurar todos os usuários com este email no Auth (mesmo se houver duplicidade oculta)
      const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const existingUsers = users.filter(u => u.email.toLowerCase() === email)
      
      for (const u of existingUsers) {
        console.log(`- Removendo Auth Antigo: ${u.id}`)
        await supabase.auth.admin.deleteUser(u.id)
      }

      // Remover do Profiles
      await supabase.from('profiles').delete().eq('email', email)
      console.log(`- Perfis antigos removidos.`)

      // 2. CRIAÇÃO LIMPA NO AUTH
      let userType = 'teacher'
      if (c.role.toLowerCase().includes('administrador') || c.name.includes('Eduardo')) {
        userType = 'admin'
      }

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          display_name: c.name,
          full_name: c.name,
          role: userType, // Role interna (admin/teacher)
          subject: c.role, // Matéria/Função
          must_change_password: true
        }
      })

      if (authError) {
        console.error(`❌ Erro ao criar Auth para ${email}: ${authError.message}`)
        continue
      }

      const newId = authData.user.id
      console.log(`✅ Auth Criado: ${newId}`)

      // 3. INSERÇÃO NO PROFILES
      const { error: profileError } = await supabase.from('profiles').insert({
        id: newId,
        email: email,
        name: c.name,
        role: c.role, // Aqui guardamos a Matéria/Função como texto
        profile_type: userType, // Aqui guardamos o tipo para o AuthProvider
        institution: 'Colégio Compromisso',
        status: 'active'
      })

      if (profileError) {
        console.error(`❌ Erro ao criar Perfil para ${email}: ${profileError.message}`)
      } else {
        console.log(`✅ Perfil sincronizado com Matéria: ${c.role}`)
      }

    } catch (err) {
      console.error(`💥 Erro fatal em ${email}:`, err.message)
    }
  }

  console.log('\n✨ OPERAÇÃO FINALIZADA COM SUCESSO! ✨')
}

resetAndCreateCollaborators()
 Richmond: 2228
