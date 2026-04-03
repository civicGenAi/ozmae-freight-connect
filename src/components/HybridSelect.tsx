import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Option {
  value: string;
  label: string;
  [key: string]: any;
}

interface HybridSelectProps {
  options: Option[];
  value?: string;
  onChange: (value: string, isNew?: boolean) => void;
  placeholder?: string;
  emptyMessage?: string;
  allowCreate?: boolean;
  className?: string;
}

export function HybridSelect({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  emptyMessage = "No results found.",
  allowCreate = false,
  className,
}: HybridSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          {selectedOption ? selectedOption.label : value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={placeholder} 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty className="py-3 px-2 text-xs text-muted-foreground flex flex-col gap-2">
            <span>{emptyMessage}</span>
            {allowCreate && searchValue && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 h-8 text-[10px] uppercase font-bold"
                onClick={() => {
                  onChange(searchValue, true);
                  setOpen(false);
                  setSearchValue("");
                }}
              >
                <Plus className="h-3 w-3" /> Create "{searchValue}"
              </Button>
            )}
          </CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={() => {
                  onChange(option.value, false);
                  setOpen(false);
                  setSearchValue("");
                }}
                className="text-xs"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
