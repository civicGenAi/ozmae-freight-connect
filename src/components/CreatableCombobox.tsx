import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface CreatableComboboxProps {
  options: string[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  className?: string
}

export function CreatableCombobox({
  options = [],
  value = "",
  onChange,
  placeholder = "Select or type...",
  emptyText = "Type to create...",
  className,
}: CreatableComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const uniqueOptions = Array.from(new Set(options)).filter(Boolean)
  const hasExactMatch = uniqueOptions.some(
    (opt) => opt.toLowerCase().trim() === inputValue.toLowerCase().trim()
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal px-3", className, !value && "text-muted-foreground")}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={`Search or create...`} 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList className="max-h-[220px]">
            <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground text-center">
               {inputValue ? `Press enter or click below to add` : emptyText}
            </CommandEmpty>
            <CommandGroup>
              {uniqueOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(v) => {
                    onChange(option)
                    setInputValue("")
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toLowerCase() === option.toLowerCase() ? "opacity-100 text-accent" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
              
              {inputValue.trim() !== "" && !hasExactMatch && (
                <CommandItem
                  value={`CREATENEW_${inputValue}`}
                  onSelect={() => {
                    onChange(inputValue.trim())
                    setInputValue("")
                    setOpen(false)
                  }}
                  className="text-accent font-medium mt-1 border-t rounded-none py-2"
                >
                  <PlusCircle className="mr-2 h-4 w-4 text-accent" />
                  Create "{inputValue.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
