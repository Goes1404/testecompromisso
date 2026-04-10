import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnonAccess() {
  const { data, error } = await supabase.from('profiles').select('*').eq('role', 'student').limit(5);
  if (error) {
    console.error("Anon access error:", error);
  } else {
    console.log("Anon access allowed. Found students:", data?.length);
  }
}

testAnonAccess();
