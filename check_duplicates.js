import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkDuplicates() {
  const { data, error } = await supabase.from('profiles').select('email, id')
  if (error) {
    console.error('Error fetching profiles:', error.message)
    return
  }

  const emailMap = new Map()
  const duplicates = []

  for (const { email, id } of data) {
    if (!email) continue
    const lowerEmail = email.toLowerCase()
    if (emailMap.has(lowerEmail)) {
      duplicates.push({ email: lowerEmail, ids: [emailMap.get(lowerEmail), id] })
    } else {
      emailMap.set(lowerEmail, id)
    }
  }

  if (duplicates.length > 0) {
    console.log('Found duplicates:', duplicates.length)
    duplicates.forEach(d => console.log(`${d.email}: ${d.ids.join(', ')}`))
  } else {
    console.log('No duplicates found in profiles table.')
  }
}

checkDuplicates()
