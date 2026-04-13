import React from "react";
import { cn } from "@/lib/utils";

export type TransportMode = "air" | "sea" | "road";

const MODES: { value: TransportMode; label: string; icon: string; color: string; bg: string; border: string }[] = [
  {
    value: "air",
    label: "Air Cargo",
    icon: "✈️",
    color: "text-sky-600",
    bg: "bg-sky-50 hover:bg-sky-100",
    border: "border-sky-300",
  },
  {
    value: "sea",
    label: "Sea Freight",
    icon: "🚢",
    color: "text-teal-600",
    bg: "bg-teal-50 hover:bg-teal-100",
    border: "border-teal-300",
  },
  {
    value: "road",
    label: "Road Transport",
    icon: "🚛",
    color: "text-amber-600",
    bg: "bg-amber-50 hover:bg-amber-100",
    border: "border-amber-300",
  },
];

interface TransportModeSelectorProps {
  value?: TransportMode | null;
  onChange: (mode: TransportMode | null) => void;
  className?: string;
}

export function TransportModeSelector({ value, onChange, className }: TransportModeSelectorProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Transport Mode <span className="font-normal italic opacity-60 ml-1">— optional, recommended</span>
      </p>
      <div className="flex gap-3">
        {MODES.map((mode) => {
          const isSelected = value === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => onChange(isSelected ? null : mode.value)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 px-5 py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                isSelected
                  ? cn(mode.bg, mode.border, mode.color, "shadow-sm scale-[1.03]")
                  : "border-border bg-muted/20 text-muted-foreground hover:border-muted-foreground/40",
              )}
            >
              <span className="text-2xl leading-none">{mode.icon}</span>
              <span className={cn("text-[10px] font-bold uppercase tracking-wide", isSelected ? mode.color : "")}>
                {mode.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Standalone badge for list views
export function TransportModeBadge({ mode }: { mode?: TransportMode | null }) {
  const found = MODES.find((m) => m.value === mode);
  if (!found) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border",
        found.bg,
        found.border,
        found.color
      )}
    >
      {found.icon} {found.label}
    </span>
  );
}

// Group header for grouped list views
export function TransportModeGroupHeader({
  mode,
  count,
  expanded,
  onToggle,
}: {
  mode: TransportMode | null;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const found = MODES.find((m) => m.value === mode);
  const icon = found?.icon ?? "📦";
  const label = found?.label ?? "Uncategorized";
  const color = found?.color ?? "text-muted-foreground";
  const bg = found?.bg ?? "bg-muted/30 hover:bg-muted/50";
  const border = found?.border ?? "border-muted/40";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all duration-200 group",
        bg,
        border
      )}
    >
      <span className="text-xl leading-none">{icon}</span>
      <div className="flex-1 flex items-center gap-2 text-left">
        <span className={cn("text-xs font-black uppercase tracking-widest", color)}>{label}</span>
        <span className="text-[9px] font-bold bg-white/60 border rounded-full px-2 py-0.5 text-muted-foreground">
          {count} {count === 1 ? "record" : "records"}
        </span>
      </div>
      <span
        className={cn(
          "text-xs font-bold transition-transform duration-200 opacity-40",
          expanded ? "rotate-90" : ""
        )}
      >
        ▶
      </span>
    </button>
  );
}
