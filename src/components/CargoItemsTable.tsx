import * as React from "react";
import { Plus, Trash2, FileSpreadsheet, Unlink, Link2, ChevronDown, X } from "lucide-react";
import { useFieldArray, Control, useWatch, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormItem,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
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
  
  const { setValue, getValues, register } = useFormContext();

  const mainUnit = useWatch({ control, name: "main_unit" });
  const extraUnits = useWatch({ control, name: "extra_units" }) || [];

  // Ensure at least one row exists
  React.useEffect(() => {
    if (fields.length === 0) {
      append({ type: "item", description: "", rate_usd: "", extra_rates: [], remarks: "", indent: 1 });
    }
  }, [fields, append]);

  const addColumn = () => {
    const currentExtra = getValues("extra_units") || [];
    setValue("extra_units", [...currentExtra, "NEW UNIT"]);
    
    // Also initialize extra_rates for all existing rows
    fields.forEach((_, idx) => {
      const row = getValues(`${name}.${idx}`);
      const extraRates = [...(row.extra_rates || [])];
      extraRates.push("");
      setValue(`${name}.${idx}.extra_rates`, extraRates);
    });
  };

  const removeColumn = (colIdx: number) => {
    const currentExtra = [...(getValues("extra_units") || [])];
    currentExtra.splice(colIdx, 1);
    setValue("extra_units", currentExtra);

    // Also remove the corresponding rate from all rows
    fields.forEach((_, idx) => {
      const row = getValues(`${name}.${idx}`);
      const extraRates = [...(row.extra_rates || [])];
      extraRates.splice(colIdx, 1);
      setValue(`${name}.${idx}.extra_rates`, extraRates);
    });
  };

  const cleanAmount = (val: any) => {
    if (!val || val === "-" || val === "—") return 0;
    const cleaned = String(val).replace(/[^\d.-]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const calculateSum = (colIdx: number) => {
    return fields.reduce((acc, _, rowIdx) => {
      const row = getValues(`${name}.${rowIdx}`);
      if (row?.type === 'header') return acc;
      
      let val = "";
      if (colIdx === 0) val = row?.rate_usd || "";
      else val = row?.extra_rates?.[colIdx - 1] || "";
      
      return acc + cleanAmount(val);
    }, 0);
  };

  const formatTotal = (num: number) => {
    if (num === 0) return "—";
    return `$ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getColWidth = (idx: number, totalExtra: number) => {
    if (idx === 0) return "min-w-[300px]"; // Description
    if (idx === totalExtra + 2) return "w-40"; // Remarks
    return "w-32"; // Rate columns
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <Label className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">Main Rate Category:</Label>
          <input 
            {...register("main_unit")}
            placeholder="1*40'HC"
            className="h-7 text-[11px] font-bold uppercase border-b border-muted-foreground/20 bg-transparent focus:outline-none focus:border-accent w-40 transition-all"
          />
        </div>
        
        <p className="text-[10px] text-muted-foreground italic">Add specific unit columns for multi-pricing inquiries.</p>
      </div>

      <div className="rounded-lg border bg-card/50 overflow-x-auto shadow-sm">
        <table className="w-full text-xs text-left border-collapse table-fixed">
          <thead className="bg-muted/50 text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b shadow-inner">
            <tr>
              <th className="px-4 py-2.5 w-8">#</th>
              <th className="px-4 py-2.5 min-w-[280px]">DESCRIPTION</th>
              {/* Main Column */}
              <th className="px-4 py-2.5 w-32 text-center border-x border-muted/20">{mainUnit || "RATE"}</th>
              {/* Extra Columns */}
              {extraUnits.map((unit: string, idx: number) => (
                <th key={idx} className="px-4 py-2.5 w-32 text-center border-r border-muted/20 group relative">
                  <input 
                    {...register(`extra_units.${idx}`)}
                    className="w-full bg-transparent text-center focus:outline-none uppercase"
                  />
                  <button 
                    onClick={() => removeColumn(idx)}
                    className="absolute -top-1 -right-1 p-0.5 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded bg-white shadow-sm border"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </th>
              ))}
              <th className="px-4 py-2.5 w-40">REMARKS</th>
              <th className="px-4 py-2.5 w-10 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.map((field, index) => (
              <tr key={field.id} className="group hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-[10px] text-muted-foreground align-top pt-4">
                  {index + 1}
                </td>
                <td className="px-3 py-2 align-top">
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Textarea
                        {...register(`${name}.${index}.description`)}
                        placeholder={(fields[index] as any).type === "header" ? "Category Section..." : "Cargo description..."}
                        style={{ paddingLeft: (fields[index] as any).type === "item" ? "20px" : "0px" }}
                        className={cn(
                          "min-h-[38px] h-auto py-1.5 text-xs border-none bg-transparent hover:bg-muted/30 focus:bg-background transition-all focus-visible:ring-1 resize-none overflow-hidden",
                          (fields[index] as any).type === "header" && "font-bold text-accent text-sm"
                        )}
                        onInput={(e: any) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                      />
                    </FormControl>
                  </FormItem>
                </td>
                
                {/* Main Rate */}
                <td className={cn("px-3 py-2 align-top", (fields[index] as any).type === "header" && "bg-muted/5")}>
                  {(fields[index] as any).type === "item" ? (
                    <div className="relative">
                      <span className="absolute left-1 top-2.5 text-[9px] font-bold text-muted-foreground opacity-40">$</span>
                      <Textarea
                        {...register(`${name}.${index}.rate_usd`)}
                        placeholder="0.00"
                        className="min-h-[38px] h-auto py-1.5 pl-4 text-xs font-bold text-right text-accent border-none bg-transparent hover:bg-muted/30 focus:bg-background transition-all focus-visible:ring-1 resize-none overflow-hidden tabular-nums"
                        onInput={(e: any) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                      />
                    </div>
                  ) : <div className="min-h-[38px]" />}
                </td>

                {/* Extra Rates */}
                {extraUnits.map((_: string, colIdx: number) => (
                  <td key={colIdx} className={cn("px-3 py-2 align-top border-l border-muted/20", (fields[index] as any).type === "header" && "bg-muted/5")}>
                    {(fields[index] as any).type === "item" ? (
                      <div className="relative">
                        <span className="absolute left-1 top-2.5 text-[9px] font-bold text-muted-foreground opacity-40">$</span>
                        <Textarea
                          {...register(`${name}.${index}.extra_rates.${colIdx}`)}
                          placeholder="0.00"
                          className="min-h-[38px] h-auto py-1.5 pl-4 text-xs font-bold text-right text-accent border-none bg-transparent hover:bg-muted/30 focus:bg-background transition-all focus-visible:ring-1 resize-none overflow-hidden tabular-nums"
                          onInput={(e: any) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                        />
                      </div>
                    ) : <div className="min-h-[38px]" />}
                  </td>
                ))}

                <td className="px-3 py-2 align-top">
                   <Textarea
                    {...register(`${name}.${index}.remarks`)}
                    placeholder="Note..."
                    className="min-h-[38px] h-auto py-1.5 text-xs italic text-muted-foreground border-none bg-transparent hover:bg-muted/30 focus:bg-background transition-all focus-visible:ring-1 resize-none overflow-hidden"
                    onInput={(e: any) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive/50 hover:text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border bg-muted/20 text-xs font-bold">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-left uppercase tracking-widest text-[9px] text-muted-foreground align-middle italic">
                Sub-Totals
              </td>
              {/* Main Total */}
              <td className="px-3 py-2 bg-yellow-400/10">
                <div className="flex items-center justify-between px-2 py-1 bg-background border border-yellow-400/50 rounded text-accent text-[12px] font-black tabular-nums shadow-sm">
                   <span className="opacity-40 text-[9px]">$</span>
                   <span>{formatTotal(calculateSum(0))}</span>
                </div>
              </td>
              {/* Extra Totals */}
              {extraUnits.map((_: string, idx: number) => (
                <td key={idx} className="px-3 py-2 bg-yellow-400/10 border-l border-muted/20">
                  <div className="flex items-center justify-between px-2 py-1 bg-background border border-yellow-400/50 rounded text-accent text-[12px] font-black tabular-nums shadow-sm">
                    <span className="opacity-40 text-[9px]">$</span>
                    <span>{formatTotal(calculateSum(idx + 1))}</span>
                  </div>
                </td>
              ))}
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
        
        <div className="p-3 bg-muted/30 border-t flex justify-between items-center">
            <div className="flex gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-bold uppercase gap-1 px-3 border-accent/20"
                        >
                            <Plus className="h-3 w-3" /> Add Row <ChevronDown className="h-2.5 w-2.5 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => append({ type: "header", description: "", rate_usd: "", extra_rates: [], remarks: "", indent: 0 })}>
                            Add Header Section
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => append({ type: "item", description: "", rate_usd: "", extra_rates: [], remarks: "", indent: 1 })}>
                            Add Sub-item Row
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-bold uppercase gap-1 px-3 border-[#F26B2A]/20 text-[#F26B2A] hover:bg-[#F26B2A]/10"
                    onClick={addColumn}
                >
                    <Plus className="h-3 w-3" /> Add Unit Column
                </Button>
            </div>
            <p className="text-[10px] text-muted-foreground italic truncate">Unit columns appear in the professional PDF.</p>
        </div>
      </div>
    </div>
  );
}
