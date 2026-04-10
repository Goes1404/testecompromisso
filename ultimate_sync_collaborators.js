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

async function ultimateCollaboratorSync() {
  console.log('🚀 INICIANDO SINCRONIZAÇÃO ULTIMATE 🚀')
  
  // 1. Carregar todos os usuários do Auth de uma vez
  let allAuthUsers = []
  let page = 1
  while(true) {
    const { data: { users } } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (!users || users.length === 0) break
    allAuthUsers = allAuthUsers.concat(users)
    page++
  }
  const authMap = new Map(allAuthUsers.map(u => [u.email.toLowerCase(), u]))
  console.log(`- Carregados ${allAuthUsers.length} usuários do Auth.`)

  const tempPassword = 'compromisso2026'

  for (const c of collaborators) {
    const email = c.email.toLowerCase().trim()
    console.log(`\nProcessando: ${c.name} (${email})`)

    try {
      let userId = null
      const existing = authMap.get(email)

      if (existing) {
        console.log(`  - Usuário já existe no Auth (ID: ${existing.id}). Atualizando...`)
        const { data, error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
          password: tempPassword,
          user_metadata: {
            display_name: c.name,
            full_name: c.name,
            role: c.role,
            subject: c.subject,
            must_change_password: true
          }
        })
        if (updateError) throw new Error(`Erro Auth Update: ${updateError.message}`)
        userId = existing.id
      } else {
        console.log(`  - Usuário NÃO existe no Auth. Criando novo...`)
        const { data, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            display_name: c.name,
            full_name: c.name,
            role: c.role,
            subject: c.subject,
            must_change_password: true
          }
        })
        if (createError) throw new Error(`Erro Auth Create: ${createError.message}`)
        userId = data.user.id
      }

      // Sincronizar Perfil
      console.log(`  - Sincronizando Perfil (role: ${c.role}, course: ${c.subject})`)
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        email: email,
        name: c.name,
        role: c.role,       // Enum: 'teacher' ou 'admin'
        profile_type: c.role, // Enum compatível com AuthProvider
        course: c.subject,   // Aqui guardamos a Matéria/Função!
        institution: 'Colégio Compromisso',
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

      if (profileError) {
        console.error(`  ❌ Erro Perfil: ${profileError.message}`)
      } else {
        console.log(`  ✅ Perfil OK!`)
      }

    } catch (err) {
      console.error(`  ❌ FALHA em ${email}: ${err.message}`)
    }
  }

  console.log('\n✨ SINCRONIZAÇÃO CONCLUÍDA! ✨')
}

ultimateCollaboratorSync()
