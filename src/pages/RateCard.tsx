import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Search, Route, Globe, Phone, Mail, User, Plus, Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RateCard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCountry, setActiveCountry] = useState("All");
  const [isNewAgentModalOpen, setIsNewAgentModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: rates, isLoading } = useQuery({
    queryKey: ["rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rate_card")
        .select("*")
        .order("country", { ascending: true })
        .order("agent_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createRateMutation = useMutation({
    mutationFn: async (newRate: any) => {
      const { error } = await supabase.from("rate_card").insert([newRate]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rates"] });
      setIsNewAgentModalOpen(false);
      toast.success("New agent/rate added successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add agent");
    }
  });

  const handleCreateAgent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      agent_name: formData.get("agent_name"),
      country: formData.get("country"),
      agent_email: formData.get("agent_email"),
      agent_phone: formData.get("agent_phone"),
      origin: formData.get("origin"),
      destination: formData.get("destination"),
      vehicle_type: formData.get("vehicle_type"),
      base_rate_usd: parseFloat(formData.get("base_rate") as string) || 0,
      per_km_rate_usd: parseFloat(formData.get("per_km_rate") as string) || 0,
      agent_category: "Freight Agent",
    };
    createRateMutation.mutate(data);
  };

   const downloadTemplate = () => {
    const templateData = [
      {
        "Agent Name": "Ozmae Clearing Ltd",
        "Country": "Tanzania",
        "Origin": "Dar Es Salaam",
        "Destination": "Arusha",
        "Vehicle Type": "truck_20t",
        "Base Rate": 1200,
        "Email": "agents@ozmae.com",
        "Phone": "+255 787 000 000"
      },
      {
        "Agent Name": "Zambia Freight Express",
        "Country": "Zambia",
        "Origin": "Lusaka",
        "Destination": "Copperbelt",
        "Vehicle Type": "truck_30t",
        "Base Rate": 2500,
        "Email": "ops@zambiafreight.zm",
        "Phone": "+260 977 000 000"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Agent_Import_Template.xlsx");
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const validVehicleTypes = ['van', 'truck_10t', 'truck_20t', 'truck_30t', 'flatbed', 'trailer'];

        const mappedData = json.map((row: any) => {
          let vehicleType = (row['Vehicle Type'] || row['Vehicle'] || '').toString().toLowerCase().trim();
          if (!validVehicleTypes.includes(vehicleType)) {
            vehicleType = 'truck_20t'; // Default fallback
          }

          return {
            agent_name: row['Agent Name'] || row['Company'] || 'Imported Agent',
            country: row['Country'] || 'Unknown',
            agent_email: row['Email'] || row['Contact Email'] || null,
            agent_phone: row['Phone'] || row['Contact Phone'] || null,
            origin: row['Origin'] || 'TBA',
            destination: row['Destination'] || 'TBA',
            vehicle_type: vehicleType,
            base_rate_usd: parseFloat(row['Rate'] || row['Base Rate'] || row['Amount']) || 0,
            agent_category: row['Category'] || 'Freight Agent',
          };
        });

        const { error } = await supabase.from('rate_card').insert(mappedData);
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["rates"] });
        toast.success(`Successfully imported ${mappedData.length} agents`);
      } catch (error: any) {
        toast.error(`Import failed: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const countries = ["All", ...Array.from(new Set(rates?.map((r: any) => r.country) || []))];

  const filtered = rates?.filter((r: any) => {
    const matchesSearch = 
      r.agent_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.destination?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.country?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCountry = activeCountry === "All" || r.country === activeCountry;
    
    return matchesSearch && matchesCountry;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Agent Library & Rates">
        <span className="text-[10px] bg-accent/10 px-2 py-1 rounded font-bold uppercase tracking-widest text-accent mr-4">Global Agent Directory</span>
         <div className="flex items-center gap-2">
          <div className="flex flex-col items-end gap-1">
            <div className="relative">
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
              />
              <Button variant="outline" className="border-accent/20 hover:border-accent hover:text-accent bg-transparent text-foreground gap-2">
                <Upload className="h-4 w-4" /> Import Excel
              </Button>
            </div>
            <button 
              onClick={downloadTemplate}
              className="text-[10px] text-accent hover:underline flex items-center gap-1"
            >
              <FileSpreadsheet className="h-2.5 w-2.5" /> Download Template
            </button>
          </div>
          <Button onClick={() => setIsNewAgentModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
            <Plus className="h-4 w-4" /> Add Agent / Rate
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 pb-2 overflow-x-auto">
          {countries.map((country: string) => (
            <button
              key={country}
              onClick={() => setActiveCountry(country)}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-full border transition-all whitespace-nowrap",
                activeCountry === country 
                  ? "bg-[#0a1e3f] text-white border-[#0a1e3f] shadow-sm" 
                  : "bg-background text-muted-foreground hover:border-accent hover:text-accent"
              )}
            >
              {country === "All" ? "🌍 All Regions" : country}
            </button>
          ))}
        </div>
        
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search agents, countries, or routes..." 
            className="pl-9 h-11"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Agent / Company</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Route & Service</TableHead>
              <TableHead className="text-right">Rate (USD)</TableHead>
              <TableHead>Country</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell>
                </TableRow>
              ))
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No agents found for this region.
                </TableCell>
              </TableRow>
            ) : filtered?.map((r: any) => (
              <TableRow key={r.id} className="hover:bg-muted/30 transition-colors group">
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-0.5">
                      <User className="h-3 w-3 text-accent" />
                      <span className="font-bold text-foreground uppercase tracking-tight">{r.agent_name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">{r.agent_category}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors">
                      <Mail className="h-3 w-3" />
                      <span>{r.agent_email || "no-email@agent.com"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{r.agent_phone || "No phone"}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <Route className="h-3.5 w-3.5 text-accent opacity-70" />
                      <span className="text-xs font-semibold">{r.origin} → {r.destination}</span>
                    </div>
                    <Badge variant="outline" className="w-fit text-[10px] py-0 px-1.5 h-4 bg-muted/50">{r.vehicle_type}</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-foreground">{formatCurrency(r.base_rate_usd)}</span>
                    {r.per_km_rate_usd > 0 && (
                      <span className="text-[10px] text-muted-foreground">+{formatCurrency(r.per_km_rate_usd)}/km</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{r.country}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={isNewAgentModalOpen} onOpenChange={setIsNewAgentModalOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Agent/Rate</SheetTitle>
            <SheetDescription>Store contact information and rates for a new agent or service provider.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreateAgent} className="space-y-4 py-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agent_name">Agent / Company Name</Label>
                <Input id="agent_name" name="agent_name" placeholder="ABC Shipping" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" placeholder="e.g. UAE, China" required />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agent_email">Contact Email</Label>
                <Input id="agent_email" name="agent_email" type="email" placeholder="agent@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent_phone">Contact Phone</Label>
                <Input id="agent_phone" name="agent_phone" placeholder="+00..." />
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Route & Pricing Information</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origin">Origin</Label>
                  <Input id="origin" name="origin" placeholder="e.g. Dubai" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input id="destination" name="destination" placeholder="e.g. Arusha" required />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle_type">Vehicle Type</Label>
                  <Input id="vehicle_type" name="vehicle_type" placeholder="truck_30t" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base_rate">Base Rate (USD)</Label>
                  <Input id="base_rate" name="base_rate" type="number" step="0.01" placeholder="0.00" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="per_km_rate">Per KM (USD)</Label>
                  <Input id="per_km_rate" name="per_km_rate" type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
            </div>

            <SheetFooter className="pt-4">
              <Button type="submit" disabled={createRateMutation.isPending} className="w-full bg-[#0a1e3f] hover:bg-[#0a1e3f]/90 text-white">
                {createRateMutation.isPending ? "Adding..." : "Save Agent & Rate"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
