import { cn } from "@/lib/utils";

const statusClassMap: Record<string, string> = {
  "New": "badge-new",
  "Inquiry": "badge-inquiry",
  "Quoted": "badge-quoted",
  "In Transit": "badge-in-transit",
  "Delivered": "badge-delivered",
  "Closed": "badge-closed",
  "Converted": "badge-converted",
  "Declined": "badge-declined",
  "Draft": "badge-draft",
  "Sent": "badge-sent",
  "Accepted": "badge-accepted",
  "Expired": "badge-expired",
  "Paid": "badge-paid",
  "Pending": "badge-pending",
  "Overdue": "badge-overdue",
  "Available": "badge-available",
  "On Job": "badge-on-job",
  "On Duty": "badge-on-duty",
  "Maintenance": "badge-maintenance",
  "Off": "badge-off",
  "Planning": "badge-planning",
  "Dispatched": "badge-dispatched",
  "At Destination": "badge-at-destination",
  "Deposit Paid": "badge-paid",
  "Awaiting Deposit": "badge-pending",
  "Fully Paid": "badge-paid",
  "Confirmed": "badge-paid",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusClassMap[status] || "badge-inquiry")}>
      {status}
    </span>
  );
}
