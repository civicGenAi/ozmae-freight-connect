
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lwzstcshggivywsghgns.supabase.co'
const supabaseKey = 'sb_publishable_jIme0Hz5gJBtEIlQmIOyyw_FmrRp946'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkLeads() {
  const { data, error } = await supabase.from('leads').select('origin, destination').limit(10)
  if (error) {
    console.error('Error fetching leads:', error)
    return
  }
  console.log('Leads found:', JSON.stringify(data, null, 2))
}

checkLeads()
