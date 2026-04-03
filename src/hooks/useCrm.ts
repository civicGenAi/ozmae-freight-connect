import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  CustomerInteraction, 
  CrmTask, 
  CustomerHealth, 
  TimelineEvent, 
  DeclineReason,
  TaskStatus
} from "@/types";

export function useCustomerInteractions(customerId?: string) {
  return useQuery({
    queryKey: ["customer_interactions", customerId],
    queryFn: async () => {
      let query = supabase
        .from("customer_interactions")
        .select(`
          *,
          customer:customers(id, company_name),
          logger:profiles!customer_interactions_logged_by_fkey(id, full_name, avatar_url),
          lead:leads(id),
          quotation:quotations(id),
          job_order:job_orders(id)
        `)
        .order("created_at", { ascending: false });

      if (customerId) {
        query = query.eq("customer_id", customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CustomerInteraction[];
    },
  });
}

export function useCrmTasks(filters?: { assignedToMe?: boolean; status?: TaskStatus; customerId?: string }) {
  return useQuery({
    queryKey: ["crm_tasks", filters],
    queryFn: async () => {
      let query = supabase
        .from("crm_tasks")
        .select(`
          *,
          customer:customers(id, company_name),
          assignee:profiles!crm_tasks_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .order("due_date", { ascending: true })
        .order("priority", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.customerId) {
        query = query.eq("customer_id", filters.customerId);
      }
      if (filters?.assignedToMe) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq("assigned_to", user.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CrmTask[];
    },
  });
}

export function useCustomerHealth(customerId?: string) {
  return useQuery({
    queryKey: ["customer_health", customerId],
    queryFn: async () => {
      // 1. Fetch formal Customers (with health)
      let customerQuery = supabase
        .from("customers")
        .select(`
          id,
          company_name,
          contact_person,
          city,
          health:customer_health(*)
        `)
        .order("company_name", { ascending: true });

      // 2. Fetch raw Leads (Prospects) - those not yet converted to customers
      let leadQuery = supabase
        .from("leads")
        .select(`
          id,
          customer_name_raw,
          origin,
          destination,
          created_at
        `)
        .is("customer_id", null)
        .order("created_at", { ascending: false });

      if (customerId) {
        customerQuery = customerQuery.eq("id", customerId);
        const { data, error } = await customerQuery.single();
        if (error && error.code !== 'PGRST116') throw error;
        return data ? { ...data, type: 'customer' } : null;
      }

      const [customersResult, leadsResult] = await Promise.all([customerQuery, leadQuery]);
      
      if (customersResult.error) throw customersResult.error;
      if (leadsResult.error) throw leadsResult.error;

      // 3. Map Customers
      const customerEntities = (customersResult.data || []).map(item => ({
        ...((item as any).health?.[0] || {}), // Flatten health metrics
        customer: item,
        customer_id: item.id,
        type: 'customer',
        display_name: item.company_name,
        display_contact: item.contact_person,
        display_location: item.city || 'Unspecified'
      }));

      // 4. Map Leads as "Prospects"
      const prospectEntities = (leadsResult.data || []).map(item => ({
        health_score: 0,
        health_label: 'prospect', // Special label for UI
        customer: {
          company_name: item.customer_name_raw,
          contact_person: `${item.origin} ➔ ${item.destination}`,
          city: 'Inquiry Phase'
        },
        customer_id: null,
        lead_id: item.id,
        type: 'prospect',
        display_name: item.customer_name_raw,
        display_contact: `${item.origin} ➔ ${item.destination}`,
        display_location: 'New Inquiry',
        created_at: item.created_at
      }));

      const combined = [...customerEntities, ...prospectEntities];
      return combined;
    },
  });
}

export function useDeclineReasons(filters?: { dateFrom?: string; dateTo?: string; customerId?: string }) {
  return useQuery({
    queryKey: ["decline_reasons", filters],
    queryFn: async () => {
      let query = supabase
        .from("decline_reasons")
        .select(`
          *,
          customer:customers(company_name),
          logger:profiles!decline_reasons_logged_by_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (filters?.customerId) {
        query = query.eq("customer_id", filters.customerId);
      }
      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DeclineReason[];
    },
  });
}

export function useCustomerTimeline(customerId: string) {
  return useQuery({
    queryKey: ["customer_timeline", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const [
        { data: leads, error: e1 },
        { data: quotes, error: e2 },
        { data: jobs, error: e3 },
        { data: invoices, error: e4 },
        { data: interactions, error: e5 }
      ] = await Promise.all([
        supabase.from("leads").select("*").eq("customer_id", customerId),
        supabase.from("quotations").select("*").eq("customer_id", customerId),
        supabase.from("job_orders").select("*").eq("customer_id", customerId),
        supabase.from("invoices").select("*").eq("customer_id", customerId),
        supabase.from("customer_interactions").select(`*, logger:profiles!customer_interactions_logged_by_fkey(full_name, avatar_url)`).eq("customer_id", customerId)
      ]);

      if (e1 || e2 || e3 || e4 || e5) {
        console.error("Error fetching timeline data");
      }

      const events: TimelineEvent[] = [];

      leads?.forEach(l => {
        events.push({
          id: `lead_${l.id}`,
          event_at: l.created_at,
          event_type: 'lead_created',
          title: 'New Lead Created',
          detail: `Route: ${l.origin} -> ${l.destination}`,
          linked_record_type: 'lead',
          linked_record_id: l.id,
          linked_record_label: l.id.split('-')[0],
          icon_color: 'blue'
        });
      });

      quotes?.forEach(q => {
        events.push({
          id: `quote_sent_${q.id}`,
          event_at: q.created_at,
          event_type: 'quote_sent',
          title: 'Quotation Generated',
          detail: `Value: $${q.total_amount_usd}`,
          linked_record_type: 'quotation',
          linked_record_id: q.id,
          linked_record_label: q.id.split('-')[0],
          icon_color: 'purple'
        });
        if (q.status === 'accepted') {
          events.push({
            id: `quote_acc_${q.id}`,
            event_at: q.updated_at || q.created_at,
            event_type: 'quote_accepted',
            title: 'Quotation Accepted',
            linked_record_type: 'quotation',
            linked_record_id: q.id,
            icon_color: 'green'
          });
        }
        if (q.status === 'declined') {
          events.push({
            id: `quote_dec_${q.id}`,
            event_at: q.updated_at || q.created_at,
            event_type: 'quote_declined',
            title: 'Quotation Declined',
            linked_record_type: 'quotation',
            linked_record_id: q.id,
            icon_color: 'red'
          });
        }
      });

      jobs?.forEach(j => {
        events.push({
          id: `job_crt_${j.id}`,
          event_at: j.created_at,
          event_type: 'job_created',
          title: 'Job Order Created',
          detail: `Route: ${j.origin} -> ${j.destination}`,
          linked_record_type: 'job_order',
          linked_record_id: j.id,
          linked_record_label: j.id.split('-')[0],
          icon_color: 'teal'
        });
        if (j.status === 'closed') {
          events.push({
             id: `job_cls_${j.id}`,
             event_at: j.updated_at || j.created_at,
             event_type: 'job_closed',
             title: 'Job Completed & Closed',
             linked_record_type: 'job_order',
             linked_record_id: j.id,
             icon_color: 'green'
          });
        }
      });

      invoices?.forEach(i => {
        events.push({
          id: `inv_iss_${i.id}`,
          event_at: i.created_at,
          event_type: 'invoice_issued',
          title: 'Invoice Issued',
          detail: `Amount: $${i.total_amount_usd}`,
          linked_record_type: 'invoice',
          linked_record_id: i.id,
          icon_color: 'gray'
        });
      });

      interactions?.forEach((i: any) => {
        events.push({
          id: `int_${i.id}`,
          event_at: i.created_at,
          event_type: 'interaction_logged',
          title: `Interaction: ${i.interaction_type.replace('_', ' ')}`,
          detail: i.subject,
          actor_name: i.logger?.full_name,
          actor_avatar: i.logger?.avatar_url,
          linked_record_type: 'interaction',
          linked_record_id: i.id,
          icon_color: 'amber'
        });
      });

      // Sort descending by event_at
      events.sort((a, b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime());

      return events;
    },
  });
}

export function useLogInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (interactionData: any) => {
      // 1. Get current logged in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        ...interactionData,
        logged_by: user.id
      };

      // Extract task specific data and then delete them from the interaction payload
      const nextAction = payload.next_action;
      const nextActionDate = payload.next_action_date;

      // Insert Interaction
      const { data, error } = await supabase
        .from("customer_interactions")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // If needed, Auto-create Task
      if (nextActionDate && nextAction) {
        const title = nextAction;
        const taskPayload = {
          customer_id: payload.customer_id,
          lead_id: payload.lead_id,
          interaction_id: data.id,
          title,
          due_date: nextActionDate,
          assigned_to: user.id,
          status: 'pending',
          priority: 'medium',
          created_by: user.id
        };

        const { error: taskError } = await supabase
          .from("crm_tasks")
          .insert(taskPayload);

        if (taskError) {
          console.error("Failed to auto-create task", taskError);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customer_interactions"] });
      queryClient.invalidateQueries({ queryKey: ["customer_timeline", data.customer_id] });
      if (data.next_action_date) {
        queryClient.invalidateQueries({ queryKey: ["crm_tasks"] });
        toast.success("Interaction logged", {
          description: "Follow-up task created for " + new Date(data.next_action_date).toLocaleDateString()
        });
      } else {
        toast.success("Interaction logged");
      }
    },
    onError: (err: any) => {
      toast.error("Failed to log interaction: " + err.message);
    }
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("crm_tasks")
        .update({
           status: 'done',
           completed_at: new Date().toISOString(),
           completed_by: user?.id
        })
        .eq("id", taskId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_tasks"] });
      toast.success("Task marked as complete");
    },
    onError: (err: any) => {
      toast.error("Failed to complete task: " + err.message);
    }
  });
}
