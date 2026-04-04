import * as React from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useFieldArray, Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

interface CargoItemsTableProps {
  control: Control<any>;
  name: string;
  className?: string;
}

export function CargoItemsTable({ control, name, className }: CargoItemsTableProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  // Ensure at least one row exists
  React.useEffect(() => {
    if (fields.length === 0) {
      append({ description: "", unit: "1*40HC", remarks: "" });
    }
  }, [fields, append]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-lg border bg-card/50 overflow-hidden shadow-sm">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-muted/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b">
            <tr>
              <th className="px-4 py-3 w-8">#</th>
              <th className="px-4 py-3 min-w-[200px]">Description</th>
              <th className="px-4 py-3 w-32">Unit/Qty</th>
              <th className="px-4 py-3">Remarks</th>
              <th className="px-4 py-3 w-10 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.map((field, index) => (
              <tr key={field.id} className="group hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground">
                  {index + 1}
                </td>
                <td className="px-3 py-2">
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input
                        {...control.register(`${name}.${index}.description`)}
                        placeholder="Cargo description..."
                        className="h-8 text-xs border-none bg-transparent hover:bg-muted/30 focus:bg-background transition-all focus-visible:ring-1"
                      />
                    </FormControl>
                  </FormItem>
                </td>
                <td className="px-3 py-2">
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input
                        {...control.register(`${name}.${index}.unit`)}
                        placeholder="1*40HC"
                        className="h-8 text-xs font-semibold text-accent border-none bg-transparent hover:bg-muted/30 focus:bg-background transition-all focus-visible:ring-1"
                      />
                    </FormControl>
                  </FormItem>
                </td>
                <td className="px-3 py-2">
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input
                        {...control.register(`${name}.${index}.remarks`)}
                        placeholder="Optional note..."
                        className="h-8 text-xs italic text-muted-foreground border-none bg-transparent hover:bg-muted/30 focus:bg-background transition-all focus-visible:ring-1"
                      />
                    </FormControl>
                  </FormItem>
                </td>
                <td className="px-3 py-2 text-right">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="p-3 bg-muted/30 border-t flex justify-between items-center">
            <p className="text-[10px] text-muted-foreground italic">Add rows for multiple containers or service line items.</p>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: "", unit: "1*40HC", remarks: "" })}
                className="h-7 text-[10px] font-bold uppercase gap-1 px-3 border-accent/20 hover:bg-accent/10"
            >
                <Plus className="h-3 w-3" /> Add Item
            </Button>
        </div>
      </div>
    </div>
  );
}
