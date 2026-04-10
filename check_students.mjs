import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { count: studentCount, error: err1 } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
  console.log("Students array length:", studentCount);

  const { count: teachersCount, error: err2 } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
  console.log("Teacher array length:", teachersCount);
}

check();
