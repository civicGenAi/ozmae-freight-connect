import { Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TableToolbar({ placeholder = "Search..." }: { placeholder?: string }) {
  return (
    <div className="flex items-center justify-between mb-4 gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={placeholder} className="pl-9 bg-card" />
      </div>
      <Button variant="outline" size="sm" className="gap-2">
        <Download className="h-4 w-4" /> Export
      </Button>
    </div>
  );
}
