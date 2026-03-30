import { PageHeader } from "@/components/PageHeader";
import { trackingJobs } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { CheckCircle, Circle, Loader } from "lucide-react";

export default function Tracking() {
  return (
    <div>
      <PageHeader title="Shipment Tracking" />

      <div className="space-y-6">
        {trackingJobs.map((job) => (
          <div key={job.id} className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">{job.id}</h3>
                <p className="text-sm text-muted-foreground">{job.customer} — {job.route}</p>
              </div>
            </div>

            <div className="space-y-0">
              {job.steps.map((step, i) => {
                const isDone = i < job.currentStep;
                const isCurrent = i === job.currentStep;
                const isFuture = i > job.currentStep;
                const isLast = i === job.steps.length - 1;

                return (
                  <div key={step} className="flex gap-4">
                    {/* Connector line + icon */}
                    <div className="flex flex-col items-center">
                      {isDone && <CheckCircle className="h-5 w-5 text-success shrink-0" />}
                      {isCurrent && <Loader className="h-5 w-5 text-accent shrink-0 animate-spin" />}
                      {isFuture && <Circle className="h-5 w-5 text-muted shrink-0" />}
                      {!isLast && (
                        <div className={cn("w-0.5 flex-1 min-h-[24px]", isDone ? "bg-success" : isCurrent ? "bg-accent" : "bg-muted")} />
                      )}
                    </div>

                    {/* Text */}
                    <div className="pb-4">
                      <p className={cn(
                        "text-sm",
                        isDone && "text-foreground",
                        isCurrent && "font-semibold text-accent",
                        isFuture && "text-muted-foreground"
                      )}>
                        {step}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
