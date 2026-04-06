require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('library_resources').insert([
    {
      title: "Material didático",
      description: "Test",
      category: "Matemática",
      type: "PDF",
      url: "http://test.com/test",
      image_url: "http://test.com/img"
    }
  ]);
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
