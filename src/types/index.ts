// Base Stubs for existing DB entities to avoid any typing errors
export interface Customer { id: string; company_name: string; contact_person?: string; city?: string; [key: string]: any; }
export interface Profile { id: string; full_name: string; avatar_url?: string; [key: string]: any; }
export interface Lead { id: string; lead_number?: string; [key: string]: any; }
export interface Quotation { id: string; quote_number?: string; [key: string]: any; }
export interface JobOrder { id: string; job_number?: string; [key: string]: any; }

export type InteractionType =
  | 'call_outbound' | 'call_inbound' | 'whatsapp'
  | 'email_sent' | 'email_received' | 'meeting' | 'site_visit' | 'note'

export type InteractionOutcome =
  | 'interested' | 'not_interested' | 'follow_up_required'
  | 'converted' | 'declined' | 'no_answer' | 'information_shared' | 'other'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'done' | 'snoozed' | 'cancelled'
export type HealthLabel = 'excellent' | 'good' | 'at_risk' | 'inactive' | 'lost'

export type DeclineReasonCategory =
  | 'price_too_high' | 'chose_competitor' | 'no_longer_needed'
  | 'timing' | 'service_mismatch' | 'bad_experience' | 'other'

export interface CustomerInteraction {
  id: string
  customer_id: string
  lead_id?: string | null
  quotation_id?: string | null
  job_order_id?: string | null
  interaction_type: InteractionType
  subject: string
  summary: string
  outcome?: InteractionOutcome | null
  next_action?: string | null
  next_action_date?: string | null
  duration_minutes?: number | null
  logged_by?: string | null
  created_at: string
  // Joined fields
  customer?: Pick<Customer, 'id' | 'company_name'>
  logger?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
  lead?: Pick<Lead, 'id' | 'lead_number'>
  quotation?: Pick<Quotation, 'id' | 'quote_number'>
  job_order?: Pick<JobOrder, 'id' | 'job_number'>
}

export interface CrmTask {
  id: string
  customer_id: string
  lead_id?: string | null
  quotation_id?: string | null
  interaction_id?: string | null
  title: string
  description?: string | null
  due_date: string
  due_time?: string | null
  priority: TaskPriority
  status: TaskStatus
  assigned_to?: string | null
  completed_at?: string | null
  completed_by?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  // Joined
  customer?: Pick<Customer, 'id' | 'company_name'>
  assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export interface CustomerHealth {
  id: string
  customer_id: string
  health_score: number
  health_label: HealthLabel
  total_jobs: number
  jobs_last_12_months: number
  total_revenue_usd: number
  revenue_last_12_months_usd: number
  avg_deal_size_usd: number
  total_leads: number
  total_quotes_sent: number
  total_quotes_accepted: number
  total_quotes_declined: number
  win_rate_pct: number
  avg_quote_to_job_days?: number | null
  last_job_date?: string | null
  last_interaction_date?: string | null
  last_quote_date?: string | null
  days_since_last_job?: number | null
  days_since_last_activity?: number | null
  total_invoiced_usd: number
  total_paid_usd: number
  outstanding_balance_usd: number
  on_time_payment_rate_pct: number
  avg_payment_delay_days?: number | null
  preferred_route?: string | null
  preferred_vehicle_type?: string | null
  most_common_cargo_type?: string | null
  updated_at: string
  // Joined
  customer?: Customer
}

export interface DeclineReason {
  id: string
  lead_id?: string | null
  quotation_id?: string | null
  customer_id: string
  reason_category: DeclineReasonCategory
  competitor_name?: string | null
  details?: string | null
  route_origin?: string | null
  route_destination?: string | null
  deal_value_usd?: number | null
  logged_by?: string | null
  created_at: string
  customer?: any
}

// Unified timeline event — used to build the activity timeline on the Customer Profile
export interface TimelineEvent {
  id: string
  event_at: string          // ISO timestamp for sorting
  event_type:
    | 'lead_created' | 'quote_sent' | 'quote_accepted' | 'quote_declined'
    | 'job_created' | 'job_status_changed' | 'job_delivered' | 'job_closed'
    | 'invoice_issued' | 'payment_received' | 'document_uploaded'
    | 'interaction_logged' | 'task_created' | 'task_completed'
  title: string             // Short human-readable description
  detail?: string           // Additional context
  actor_name?: string       // Who performed this action
  actor_avatar?: string
  linked_record_type?: 'lead' | 'quotation' | 'job_order' | 'invoice' | 'payment' | 'document' | 'interaction'
  linked_record_id?: string
  linked_record_label?: string  // e.g. "JOB-3018" or "QTE-2041"
  icon_color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal' | 'gray'
}
