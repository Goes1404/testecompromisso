
import { createClient } from '@supabase/supabase-client'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function testInsert() {
  const { data, error } = await supabase
    .from('announcements')
    .insert([{
      title: 'Teste',
      message: 'Mensagem de teste',
      priority: 'low',
      target_group: 'all',
      author_id: 'd9e03063-8822-4a00-ab6c-54be412b1d31' // Just a random UUID for testing if column exists
    }])
    .select()

  if (error) {
    console.error('ERROR:', error)
  } else {
    console.log('SUCCESS:', data)
  }
}

testInsert()
