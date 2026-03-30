import { cn } from "@/lib/utils";

interface FilterTabsProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

export function FilterTabs({ tabs, active, onChange }: FilterTabsProps) {
  return (
    <div className="flex items-center gap-1 mb-4 bg-muted p-1 rounded-lg w-fit">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-md transition-colors font-medium",
            active === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
