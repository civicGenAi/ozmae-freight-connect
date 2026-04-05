import * as React from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
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
import { useCustomLocations, useSaveCustomLocation } from "@/hooks/useCrm";

// A curated list of major global ports and logistics hubs
const WORLD_LOCATIONS = [
  // East Africa
  { label: "Dar es Salaam, TZ (DAR)", value: "Dar es Salaam, TZ" },
  { label: "Arusha, TZ (ARK)", value: "Arusha, TZ" },
  { label: "Mombasa, KE (MBA)", value: "Mombasa, KE" },
  { label: "Nairobi, KE (NBO)", value: "Nairobi, KE" },
  { label: "Zanzibar, TZ (ZNZ)", value: "Zanzibar, TZ" },
  { label: "Mwanza, TZ (MWZ)", value: "Mwanza, TZ" },
  { label: "Entebbe, UG (EBB)", value: "Entebbe, UG" },
  { label: "Kampala, UG", value: "Kampala, UG" },
  { label: "Kigali, RW (KGL)", value: "Kigali, RW" },
  { label: "Bujumbura, BI (BJM)", value: "Bujumbura, BI" },
  
  // Middle East & India
  { label: "Dubai, UAE (DXB)", value: "Dubai, UAE" },
  { label: "Jebel Ali, UAE", value: "Jebel Ali, UAE" },
  { label: "Abu Dhabi, UAE (AUH)", value: "Abu Dhabi, UAE" },
  { label: "Mumbai, IN (BOM)", value: "Mumbai, IN" },
  { label: "Nhava Sheva, IN", value: "Nhava Sheva, IN" },
  { label: "Chennai, IN (MAA)", value: "Chennai, IN" },
  { label: "Istanbul, TR (IST)", value: "Istanbul, TR" },
  
  // Asia
  { label: "Shanghai, CN (PVG)", value: "Shanghai, CN" },
  { label: "Ningbo, CN (NGB)", value: "Ningbo, CN" },
  { label: "Guangzhou, CN (CAN)", value: "Guangzhou, CN" },
  { label: "Shenzhen, CN (SZX)", value: "Shenzhen, CN" },
  { label: "Hong Kong, HK (HKG)", value: "Hong Kong, HK" },
  { label: "Singapore, SG (SIN)", value: "Singapore, SG" },
  { label: "Tokyo, JP (NRT)", value: "Tokyo, JP" },
  
  // Europe
  { label: "London, UK (LHR)", value: "London, UK" },
  { label: "Felixstowe, UK", value: "Felixstowe, UK" },
  { label: "Hamburg, DE (HAM)", value: "Hamburg, DE" },
  { label: "Rotterdam, NL (RTM)", value: "Rotterdam, NL" },
  { label: "Antwerp, BE (ANR)", value: "Antwerp, BE" },
  { label: "Barcelona, ES (BCN)", value: "Barcelona, ES" },
  { label: "Genoa, IT (GOA)", value: "Genoa, IT" },
  
  // Americas
  { label: "New York, USA (JFK)", value: "New York, USA" },
  { label: "Newark, USA (EWR)", value: "Newark, USA" },
  { label: "Los Angeles, USA (LAX)", value: "Los Angeles, USA" },
  { label: "Long Beach, USA (LGB)", value: "Long Beach, USA" },
  { label: "Savannah, USA", value: "Savannah, USA" },
  { label: "Toronto, CA (YYZ)", value: "Toronto, CA" },
  { label: "Sao Paulo, BR (GRU)", value: "Sao Paulo, BR" },
  
  // Rest of Africa
  { label: "Durban, ZA (DUR)", value: "Durban, ZA" },
  { label: "Cape Town, ZA (CPT)", value: "Cape Town, ZA" },
  { label: "Johannesburg, ZA (JNB)", value: "Johannesburg, ZA" },
  { label: "Lagos, NG (LOS)", value: "Lagos, NG" },
  { label: "Cairo, EG (CAI)", value: "Cairo, EG" },
  { label: "Casablanca, MA (CMN)", value: "Casablanca, MA" },
].sort((a, b) => a.label.localeCompare(b.label));

interface LocationSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const LocationSelect = React.forwardRef<HTMLButtonElement, LocationSelectProps>(
  ({ value, onChange, placeholder = "Search world cities/ports...", className, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState("");

    const { data: customLocations = [] } = useCustomLocations();
    const saveLocationMutation = useSaveCustomLocation();

    // Merge static and dynamic locations
    const allLocations = React.useMemo(() => {
      const combined = [...WORLD_LOCATIONS];
      
      // Only add custom ones that aren't already in static list
      customLocations.forEach(cust => {
        if (!combined.find(l => l.value === cust.value)) {
          combined.push(cust);
        }
      });
      
      return combined.sort((a, b) => a.label.localeCompare(b.label));
    }, [customLocations]);

    const selectedLocation = allLocations.find((loc) => loc.value === value);

    const handleSaveCustom = async () => {
      if (!searchValue.trim()) return;
      
      const newLoc = { label: searchValue.trim(), value: searchValue.trim() };
      
      // Save to database
      saveLocationMutation.mutate(newLoc);
      
      // Set as current value
      onChange(newLoc.value);
      setOpen(false);
      setSearchValue("");
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal h-10 px-3", className, !value && "text-muted-foreground")}
            {...props}
          >
            <div className="flex items-center gap-2 truncate text-xs text-left">
              <Globe className="h-4 w-4 shrink-0 opacity-50 text-accent" />
              <span className="truncate">
                {selectedLocation ? selectedLocation.label : value || placeholder}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Type city or port name..." 
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-10 text-xs"
            />
            <CommandList className="max-h-64 overflow-y-auto">
              <CommandEmpty className="p-3 text-xs text-muted-foreground flex flex-col gap-2 bg-muted/20">
                <span className="font-semibold italic">"{searchValue}" not found in our list.</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 h-8 text-[10px] uppercase font-bold"
                  onClick={handleSaveCustom}
                  disabled={saveLocationMutation.isPending}
                >
                  {saveLocationMutation.isPending ? "Saving..." : `Use custom location "${searchValue}"`}
                </Button>
              </CommandEmpty>
              <CommandGroup heading="Locations & Ports">
                {allLocations.map((location) => (
                  <CommandItem
                    key={location.value}
                    value={location.label}
                    onSelect={() => {
                      onChange(location.value);
                      setOpen(false);
                      setSearchValue("");
                    }}
                    className="text-xs"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === location.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {location.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

LocationSelect.displayName = "LocationSelect";
