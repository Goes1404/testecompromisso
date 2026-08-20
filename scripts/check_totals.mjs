import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Quantos alunos temos no banco?
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("profile_type", "student");

  if (error) { console.error(error); process.exit(1); }

  console.log(`\n📊 Total de alunos cadastrados no banco: ${profiles.length}`);
  console.log(`\nPrimeiros 20 nomes no banco:`);
  profiles.slice(0, 20).forEach(p => console.log(`  - "${p.name}" (${p.email})`));

  // Quantos estao no PDF?
  const students = JSON.parse(fs.readFileSync('parsed_students.json', 'utf8'));
  console.log(`\n📄 Total de alunos no PDF: ${students.length}`);
  console.log(`\nPrimeiros 20 nomes no PDF:`);
  students.slice(0, 20).forEach(s => console.log(`  - "${s.name}"`));
}

run().catch(console.error);
