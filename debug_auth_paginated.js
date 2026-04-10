import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugAuth() {
  // 1. Get all users from Auth (handling pagination)
  let allAuthUsers = []
  let page = 1
  let hasMore = true
  
  while (hasMore) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 1000
    })
    
    if (error) {
      console.error('Error listing users:', error)
      break
    }
    
    if (users.length === 0) {
      hasMore = false
    } else {
      allAuthUsers = [...allAuthUsers, ...users]
      page++
    }
  }

  console.log(`Total de usuários no Auth: ${allAuthUsers.length}`)

  // 2. Get all teacher profiles
  const { data: profiles } = await supabase.from('profiles').select('*').ilike('profile_type', 'teacher')
  console.log(`Total de perfis de professores: ${profiles?.length}`)

  const authEmails = new Set(allAuthUsers.map(u => u.email?.toLowerCase()))
  
  const teachersInAuth = profiles.filter(p => authEmails.has(p.email.toLowerCase()))
  const teachersMissingAuth = profiles.filter(p => !authEmails.has(p.email.toLowerCase()))

  console.log(`Professores COM conta no Auth: ${teachersInAuth.length}`)
  console.log(`Professores SEM conta no Auth: ${teachersMissingAuth.length}`)

  if (teachersInAuth.length > 0) {
     console.log('Exemplos COM Auth:')
     teachersInAuth.slice(0, 3).forEach(p => console.log(`- ${p.email}`))
  }
}

debugAuth()
