import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixTrailVisibility() {
  console.log('Updating trail visibility...');
  
  const { data: trails, error: fetchError } = await supabase
    .from('trails')
    .select('id, title, target_audience');

  if (fetchError) {
    console.error('Error fetching trails:', fetchError);
    return;
  }

  for (const trail of trails) {
    if (trail.target_audience === 'enem') {
      console.log(`Updating trail "${trail.title}" (ID: ${trail.id}) from "enem" to "all"...`);
      const { error: updateError } = await supabase
        .from('trails')
        .update({ target_audience: 'all' })
        .eq('id', trail.id);
      
      if (updateError) {
        console.error(`Error updating trail ${trail.title}:`, updateError);
      } else {
        console.log(`Successfully updated "${trail.title}".`);
      }
    }
  }
  
  console.log('Visibility update complete.');
}

fixTrailVisibility()
