
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugQuery() {
  console.log("Attempting full JobOrders query...")
  const { data, error } = await supabase
    .from("job_orders")
    .select(`
      id,
      job_number,
      customer_id,
      quotation_id,
      origin,
      destination,
      status,
      total_amount,
      assigned_driver_id,
      assigned_vehicle_id,
      created_at,
      customer:customers(company_name),
      driver:drivers(full_name),
      vehicle:vehicles(plate_number),
      quotation:quotations(total_amount_usd)
    `)
    .limit(1)

  if (error) {
    console.error("QUERY ERROR:", JSON.stringify(error, null, 2))
  } else {
    console.log("QUERY SUCCESS!", data)
  }
}

debugQuery()
