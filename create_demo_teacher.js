const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manually load .env.local
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createDemoTeacher() {
  const email = "professor@compromisso.com";
  const password = "123456789";

  console.log("Checking if user exists...");
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  const existingUser = users.users.find(u => u.email === email);

  let userId;
  if (existingUser) {
    console.log("User already exists inside Auth, updating metadata...");
    userId = existingUser.id;
    await supabase.auth.admin.updateUserById(userId, {
      password: password,
      user_metadata: { role: 'teacher', full_name: 'Professor Teste', must_change_password: false },
      email_confirm: true
    });
  } else {
    console.log("Creating user in Auth...");
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { role: 'teacher', full_name: 'Professor Teste', must_change_password: false }
    });
    if (createError) throw createError;
    userId = newUser.user.id;
  }

  // Upsert profile
  console.log("Upserting user profile...");
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      name: 'Professor Teste',
      email: email,
      profile_type: 'teacher',
      status: 'active',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (profileError) throw profileError;

  console.log("Teacher profile successfully created and configured!");
}

createDemoTeacher().catch(console.error);
