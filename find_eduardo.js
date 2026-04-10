import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function findEduardo() {
  let allAuthUsers = []
  let page = 1
  let hasMore = true
  while (hasMore) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: page, perPage: 1000 })
    if (error || users.length === 0) { hasMore = false } 
    else { allAuthUsers = [...allAuthUsers, ...users]; page++ }
  }

  const matches = allAuthUsers.filter(u => u.email.toLowerCase().includes('eduardo'))
  console.log(JSON.stringify(matches.map(u => ({email: u.email, id: u.id})), null, 2))
}

findEduardo()
