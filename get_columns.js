import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: leadData } = await supabase.from('leads').select('*').limit(1);
  const { data: custData } = await supabase.from('customers').select('*').limit(1);
  console.log("LEADS:"); console.log(leadData ? Object.keys(leadData[0] || {}) : 'No data');
  console.log("CUSTOMERS:"); console.log(custData ? Object.keys(custData[0] || {}) : 'No data');
}
check();
