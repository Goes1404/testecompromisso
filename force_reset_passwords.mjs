import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching all student profiles...");
  // Use pagination if there are > 1000, though max is 718
  let allStudents = [];
  let hasMore = true;
  let page = 0;
  
  while(hasMore) {
    const { data: students, error } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('profile_type', 'student')
      .range(page * 1000, (page + 1) * 1000 - 1);
      
    if (error) {
      console.error(error);
      process.exit(1);
    }
    
    if (students.length === 0) {
      hasMore = false;
    } else {
      allStudents = allStudents.concat(students);
      page++;
    }
  }
  
  console.log(`Found ${allStudents.length} students. Updating all passwords to 'compromisso2026'...`);
  
  let success = 0;
  let fails = 0;
  
  for (let i = 0; i < allStudents.length; i++) {
    const student = allStudents[i];
    
    const { error: userError } = await supabase.auth.admin.updateUserById(student.id, {
      password: 'compromisso2026'
    });
    
    if (userError) {
      console.log(`Failed for ${student.email}: ${userError.message}`);
      fails++;
    } else {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', student.id);
        
      if (profileError) {
        console.log(`Failed to update profile for ${student.email}: ${profileError.message}`);
      }
      success++;
    }
    
    if ((i+1) % 50 === 0) {
      console.log(`Processed ${i+1}/${allStudents.length}...`);
    }
  }
  
  console.log(`Done. Success: ${success}, Fails: ${fails}`);
}

main();
