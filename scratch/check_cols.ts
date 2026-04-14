import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lwzstcshggivywsghgns.supabase.co'
const supabaseKey = 'sb_publishable_jIme0Hz5gJBtEIlQmIOyyw_FmrRp946'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCols() {
  try {
    const { data, error } = await supabase.from('job_orders').select('*').limit(1)
    if (error) {
       console.error("Supabase Error:", error.message)
       // Try to just get columns from a different approach if select * fails
       const { data: cols } = await supabase.rpc('get_table_columns', { table_name: 'job_orders' })
       if (cols) console.log("Columns via RPC:", cols)
    } else {
       if (data && data.length > 0) {
         console.log("Found record. Columns:", Object.keys(data[0]))
       } else {
         console.log("Table is empty. Checking schema via empty select...")
         const { data: emptyData, error: emptyError } = await supabase.from('job_orders').select().limit(0)
         // This might not show columns in some versions of PostgREST if no rows exist
         console.log("Empty Select result:", emptyData)
       }
    }
  } catch (e: any) {
    console.error("Execution Error:", e.message)
  }
}

checkCols()
