import { PageHeader } from "@/components/PageHeader";
import { Building2, Mail, Phone, MapPin, Globe } from "lucide-react";

export default function CompanyProfile() {
  return (
    <div>
      <PageHeader title="Company Profile" />
      <div className="bg-card rounded-lg border p-6 max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Ozmae Freight Solutions</h3>
            <p className="text-sm text-muted-foreground">East African Logistics & Freight</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {[
            { icon: MapPin, label: "Address", value: "Plot 14, Nyerere Road, Dar es Salaam, Tanzania" },
            { icon: Phone, label: "Phone", value: "+255 222 123 456" },
            { icon: Mail, label: "Email", value: "info@ozmaefreight.co.tz" },
            { icon: Globe, label: "Website", value: "www.ozmaefreight.co.tz" },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <item.icon className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs">{item.label}</p>
                <p className="font-medium text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">TIN</p>
          <p className="text-sm font-medium">123-456-789</p>
        </div>
      </div>
    </div>
  );
}
