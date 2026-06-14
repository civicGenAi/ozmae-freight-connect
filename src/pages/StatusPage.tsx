import { PageHeader } from "@/components/PageHeader";
import { SystemStatusPanel } from "@/components/SystemStatusPanel";

export default function StatusPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="System Status" />
      <SystemStatusPanel />
    </div>
  );
}
