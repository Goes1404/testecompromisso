
const { createClient } = require('@supabase/supabase-js');
const url = 'https://qjdcexrirortchemezij.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZGNleHJpcm9ydGNoZW1lemlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM4ODQzOSwiZXhwIjoyMDg1OTY0NDM5fQ.vWXpOAs-T1WP20ERdZnRpFS81eKnzHPO-zUML5BL--o';
const supabase = createClient(url, key);

async function list() {
  const { data, error } = await supabase.from('library_resources').select('*').limit(3);
  if (error) console.error(error);
  console.log(JSON.stringify(data, null, 2));
}

list();
