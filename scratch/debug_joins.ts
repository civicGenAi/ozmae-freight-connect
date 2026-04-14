
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugJobQuery() {
  console.log("--- DEBUG START ---")
  
  // 1. Base Select
  const base = await supabase.from("job_orders").select("id, status").limit(1)
  console.log("Base Query:", base.error ? "FAILED" : "SUCCESS", base.error?.message || "")

  // 2. Customer Join
  const cust = await supabase.from("job_orders").select("id, customer:customers(company_name)").limit(1)
  console.log("Customer Join:", cust.error ? "FAILED" : "SUCCESS", cust.error?.message || "")

  // 3. Driver Join
  const drv = await supabase.from("job_orders").select("id, driver:drivers(full_name)").limit(1)
  console.log("Driver Join:", drv.error ? "FAILED" : "SUCCESS", drv.error?.message || "")

  // 4. Vehicle Join
  const veh = await supabase.from("job_orders").select("id, vehicle:vehicles(plate_number)").limit(1)
  console.log("Vehicle Join:", veh.error ? "FAILED" : "SUCCESS", veh.error?.message || "")

  // 5. Quotation Join
  const quot = await supabase.from("job_orders").select("id, quotation:quotations(total_amount_usd)").limit(1)
  console.log("Quotation Join:", quot.error ? "FAILED" : "SUCCESS", quot.error?.message || "")

  console.log("--- DEBUG END ---")
}

debugJobQuery()
