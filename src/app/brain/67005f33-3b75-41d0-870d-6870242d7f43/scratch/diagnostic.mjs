import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnostic() {
  console.log('--- Diagnostic starting ---');
  
  // 1. Check for orphaned contents
  const { data: orphanedContents } = await supabase.from('learning_contents').select('id, title, module_id').is('module_id', null);
  console.log(`Orphaned contents (no module_id): ${orphanedContents?.length || 0}`);
  if (orphanedContents?.length) console.log(orphanedContents);

  // 2. Check for contents whose module_id doesn't exist in modules
  const { data: allContents } = await supabase.from('learning_contents').select('id, title, module_id');
  const { data: allModules } = await supabase.from('modules').select('id');
  const moduleIds = new Set(allModules?.map(m => m.id));
  const invalidModuleContents = allContents?.filter(c => c.module_id && !moduleIds.has(c.module_id));
  console.log(`Contents with invalid module_id: ${invalidModuleContents?.length || 0}`);
  if (invalidModuleContents?.length) console.log(invalidModuleContents);

  // 3. Check for modules with no trail_id
  const { data: orphanedModules } = await supabase.from('modules').select('id, title, trail_id').is('trail_id', null);
  console.log(`Orphaned modules (no trail_id): ${orphanedModules?.length || 0}`);
  if (orphanedModules?.length) console.log(orphanedModules);

  // 4. Check for modules whose trail_id doesn't exist in trails
  const { data: allTrails } = await supabase.from('trails').select('id');
  const trailIds = new Set(allTrails?.map(t => t.id));
  const invalidTrailModules = allModules?.filter(m => m.trail_id && !trailIds.has(m.trail_id)); // Wait I need modules with trail_id
  const { data: allModulesComplete } = await supabase.from('modules').select('id, title, trail_id');
  const invalidTrailModulesFix = allModulesComplete?.filter(m => m.trail_id && !trailIds.has(m.trail_id));
  console.log(`Modules with invalid trail_id: ${invalidTrailModulesFix?.length || 0}`);
  if (invalidTrailModulesFix?.length) console.log(invalidTrailModulesFix);

  // 5. Check trails target_audience
  const { data: trails } = await supabase.from('trails').select('id, title, target_audience, status');
  console.log('Trail configurations:');
  trails?.forEach(t => console.log(`- ${t.title}: Status=${t.status}, Audience=${t.target_audience}`));

  console.log('--- Diagnostic finished ---');
}

diagnostic()
