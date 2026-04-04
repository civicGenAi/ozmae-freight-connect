import * as React from "react";
import { Check, ChevronsUpDown, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

// Curated list of countries with codes
const COUNTRIES = [
  { code: "+255", label: "Tanzania", flag: "🇹🇿" },
  { code: "+971", label: "UAE", flag: "🇦🇪" },
  { code: "+254", label: "Kenya", flag: "🇰🇪" },
  { code: "+256", label: "Uganda", flag: "🇺🇬" },
  { code: "+250", label: "Rwanda", flag: "🇷🇼" },
  { code: "+86", label: "China", flag: "🇨🇳" },
  { code: "+44", label: "UK", flag: "🇬🇧" },
  { code: "+1", label: "USA/Canada", flag: "🇺🇸" },
  { code: "+91", label: "India", flag: "🇮🇳" },
  { code: "+27", label: "South Africa", flag: "🇿🇦" },
  { code: "+257", label: "Burundi", flag: "🇧🇮" },
  { code: "+251", label: "Ethiopia", flag: "🇪🇹" },
  { code: "+49", label: "Germany", flag: "🇩🇪" },
  { code: "+31", label: "Netherlands", flag: "🇳🇱" },
  { code: "+33", label: "France", flag: "🇫🇷" },
  { code: "+39", label: "Italy", flag: "🇮🇹" },
  { code: "+90", label: "Turkey", flag: "🇹🇷" },
  { code: "+20", label: "Egypt", flag: "🇪🇬" },
  { code: "+966", label: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+968", label: "Oman", flag: "🇴🇲" },
].sort((a, b) => a.label.localeCompare(b.label));

interface PhoneInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const PhoneInput = React.forwardRef<HTMLDivElement, PhoneInputProps>(
  ({ value = "", onChange, placeholder = "Phone number...", className, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    
    const selectedCountry = COUNTRIES.find(c => value.startsWith(c.code)) || COUNTRIES.find(c => c.label === "Tanzania")!;
    const displayValue = value.replace(selectedCountry.code, "").trim();

    const handleCountryChange = (code: string) => {
      onChange(`${code} ${displayValue}`);
      setOpen(false);
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, ""); // Keep only digits
      onChange(`${selectedCountry.code} ${raw}`);
    };

    return (
      <div 
        ref={ref} 
        className={cn("flex gap-2", className)} 
        {...props}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[100px] flex justify-between gap-1 px-3 h-10 border-input bg-background text-[10px]"
            >
              <span className="truncate flex items-center gap-1 font-bold">
                {selectedCountry.flag} {selectedCountry.code}
              </span>
              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[180px] p-0" align="start">
            <Command className="h-64">
              <CommandInput placeholder="Search country..." className="h-9 text-xs" />
              <CommandList className="max-h-64">
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {COUNTRIES.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={`${country.label} ${country.code}`}
                      onSelect={() => handleCountryChange(country.code)}
                      className="text-xs"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCountry.code === country.code ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="mr-2">{country.flag}</span>
                      {country.label} ({country.code})
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        <div className="relative flex-1">
          <Input
            type="tel"
            placeholder={placeholder}
            value={displayValue}
            onChange={handleNumberChange}
            className="pl-8 h-10 w-full text-xs"
          />
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-50" />
        </div>
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
