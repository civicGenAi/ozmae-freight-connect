import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Truck, User, Phone, Tag, Shield, Trash2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet } from "lucide-react";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";

export default function Fleet() {
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [driverToDelete, setDriverToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("plate_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: drivers, isLoading: driversLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          *,
          assigned_vehicle:vehicles(plate_number)
        `)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createVehicleMutation = useMutation({
    mutationFn: async (newVehicle: any) => {
      const { error } = await supabase.from("vehicles").insert([newVehicle]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setIsVehicleModalOpen(false);
      toast.success("Vehicle added to fleet");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createDriverMutation = useMutation({
    mutationFn: async (newDriver: any) => {
      const { error } = await supabase.from("drivers").insert([newDriver]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setIsDriverModalOpen(false);
      toast.success("Driver registered successfully");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setVehicleToDelete(null);
      toast.success("Vehicle removed");
    },
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drivers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setDriverToDelete(null);
      toast.success("Driver removed");
    },
  });

  const filteredVehicles = vehicles?.filter((v: any) => 
    v.plate_number?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.vehicle_type?.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  const filteredDrivers = drivers?.filter((d: any) => 
    d.full_name?.toLowerCase().includes(driverSearch.toLowerCase()) ||
    d.phone?.toLowerCase().includes(driverSearch.toLowerCase())
  );

  const handleAddVehicle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createVehicleMutation.mutate({
      plate_number: formData.get("plate_number"),
      vehicle_type: formData.get("vehicle_type"),
      capacity_tons: parseFloat(formData.get("capacity") as string),
      status: "available",
    });
  };

  const handleAddDriver = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createDriverMutation.mutate({
      full_name: formData.get("full_name"),
      phone: formData.get("phone"),
      license_class: formData.get("license"),
      status: "available",
    });
  };

  const downloadVehicleTemplate = () => {
    const data = [
      { "Plate Number": "T 123 ABC", "Vehicle Type": "Semi-Trailer", "Capacity (Tons)": 28 },
      { "Plate Number": "T 456 DEF", "Vehicle Type": "Flatbed", "Capacity (Tons)": 30 }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vehicles");
    XLSX.writeFile(wb, "Ozmae_Vehicles_Template.xlsx");
  };

  const downloadDriverTemplate = () => {
    const data = [
      { "Full Name": "John Doe", "Phone Number": "+255 700 000 000", "License Class": "Class E" },
      { "Full Name": "Jane Smith", "Phone Number": "+255 700 111 222", "License Class": "Class C" }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Drivers");
    XLSX.writeFile(wb, "Ozmae_Drivers_Template.xlsx");
  };

  const handleVehicleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataStatus = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(dataStatus, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const mapped = json.map((row: any) => {
          const validTypes = ['van', 'truck_10t', 'truck_20t', 'truck_30t', 'flatbed', 'trailer'];
          let type = (row['Vehicle Type'] || row['Type'] || '').toString().toLowerCase().replace(' ', '_');
          if (!validTypes.includes(type)) type = 'truck_20t';

          return {
            plate_number: row['Plate Number'] || row['Plate'] || 'Unknown',
            vehicle_type: type,
            capacity_tons: parseFloat(row['Capacity (Tons)'] || row['Capacity'] || '0'),
            status: 'available'
          };
        });

        const { error } = await supabase.from('vehicles').insert(mapped);
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        toast.success(`Successfully imported ${mapped.length} vehicles`);
      } catch (err: any) {
        toast.error(`Import failed: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDriverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataStatus = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(dataStatus, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const mapped = json.map((row: any) => ({
          full_name: row['Full Name'] || row['Name'] || 'New Driver',
          phone: (row['Phone Number'] || row['Phone'] || '').toString(),
          license_class: row['License Class'] || row['License'] || 'TBA',
          status: 'available'
        }));

        const { error } = await supabase.from('drivers').insert(mapped);
        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ["drivers"] });
        toast.success(`Successfully imported ${mapped.length} drivers`);
      } catch (err: any) {
        toast.error(`Import failed: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-12">
      {/* Vehicles Section */}
      <div className="space-y-6">
        <PageHeader title="Fleet & Drivers">
          <div className="flex flex-wrap items-center gap-4">
            {/* Vehicle Controls */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".xlsx,.xls,.csv" onChange={handleVehicleUpload} />
                  <Button variant="outline" size="sm" className="h-9 border-accent/20 hover:border-accent hover:text-accent gap-2">
                    <Upload className="h-3.5 w-3.5" /> Import Vehicles
                  </Button>
                </div>
                <Button onClick={() => setIsVehicleModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground h-9 gap-2">
                  <Plus className="h-4 w-4" /> Add Vehicle
                </Button>
              </div>
              <button onClick={downloadVehicleTemplate} className="text-[9px] text-accent hover:underline flex items-center gap-1">
                <FileSpreadsheet className="h-2.5 w-2.5" /> Driver Template
              </button>
            </div>

            <div className="h-8 w-[1px] bg-border mx-2 hidden md:block" />

            {/* Driver Controls */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".xlsx,.xls,.csv" onChange={handleDriverUpload} />
                  <Button variant="outline" size="sm" className="h-9 border-primary/20 hover:border-primary hover:text-primary gap-2">
                    <Upload className="h-3.5 w-3.5" /> Import Drivers
                  </Button>
                </div>
                <Button onClick={() => setIsDriverModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 gap-2">
                  <Plus className="h-4 w-4" /> Add Driver
                </Button>
              </div>
              <button onClick={downloadDriverTemplate} className="text-[9px] text-primary hover:underline flex items-center gap-1">
                <FileSpreadsheet className="h-2.5 w-2.5" /> Driver Template
              </button>
            </div>
          </div>
        </PageHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-accent" />
              <h3 className="font-bold text-lg text-foreground tracking-tight">Vehicles</h3>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search vehicles..." 
                className="pl-9 h-10 text-sm"
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Plate Number</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Type</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Capacity</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Current Job</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehiclesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredVehicles?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No vehicles found.</TableCell>
                  </TableRow>
                ) : filteredVehicles?.map((v: any) => (
                  <TableRow key={v.id} className="hover:bg-muted/30 transition-colors group">
                    <TableCell>
                      <span className="font-mono text-sm font-bold bg-muted px-2 py-1 rounded border shadow-sm group-hover:bg-accent/10 group-hover:text-accent group-hover:border-accent/20 transition-all">
                        {v.plate_number}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{v.vehicle_type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3" /> {v.capacity_tons} Tons
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={v.status} /></TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">{v.current_job_id ? `JOB-${v.current_job_id.split('-')[0].toUpperCase()}` : "—"}</TableCell>
                    <TableCell>
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-rose-500 hover:text-white transition-all rounded-full"
                        onClick={() => setVehicleToDelete(v.id)}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Drivers Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-accent" />
            <h3 className="font-bold text-lg text-foreground tracking-tight">Drivers</h3>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search drivers..." 
              className="pl-9 h-10 text-sm"
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Name</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Phone</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">License</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Vehicle</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driversLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><div className="h-10 bg-muted/50 animate-pulse rounded" /></TableCell>
                  </TableRow>
                ))
              ) : filteredDrivers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No drivers found.</TableCell>
                </TableRow>
              ) : filteredDrivers?.map((d: any) => (
                <TableRow key={d.id} className="hover:bg-muted/30 transition-colors group">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                        {d.full_name?.split(' ').map((n:any) => n[0]).join('')}
                      </div>
                      <span className="font-semibold text-foreground">{d.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" /> {d.phone || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Shield className="h-3 w-3 text-accent" />
                      <span className="font-bold text-accent">{d.license_class}</span>
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                  <TableCell>
                    <span className="text-sm font-mono font-bold text-muted-foreground italic">
                      {d.assigned_vehicle?.plate_number || "Unassigned"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-rose-500 hover:text-white transition-all rounded-full"
                      onClick={() => setDriverToDelete(d.id)}
                    >
                       <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Vehicle Dialog */}
      <Dialog open={isVehicleModalOpen} onOpenChange={setIsVehicleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogDescription>Register a new vehicle in the fleet.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddVehicle} className="space-y-4 py-4">
             <div className="space-y-2">
                <Label>Plate Number</Label>
                <Input name="plate_number" placeholder="T 123 ABC" required />
             </div>
             <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <Select name="vehicle_type" defaultValue="truck_20t" required>
                  <SelectTrigger className="bg-muted/50 border-accent/20">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="truck_10t">Truck (10 Ton)</SelectItem>
                    <SelectItem value="truck_20t">Truck (20 Ton)</SelectItem>
                    <SelectItem value="truck_30t">Truck (30 Ton)</SelectItem>
                    <SelectItem value="flatbed">Flatbed</SelectItem>
                    <SelectItem value="trailer">Trailer</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>Capacity (Tons)</Label>
                <Input name="capacity" type="number" placeholder="28" required />
             </div>
             <DialogFooter className="pt-4">
                <Button type="submit" disabled={createVehicleMutation.isPending} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  {createVehicleMutation.isPending ? "Adding..." : "Register Vehicle"}
                </Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Driver Dialog */}
      <Dialog open={isDriverModalOpen} onOpenChange={setIsDriverModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Driver</DialogTitle>
            <DialogDescription>Add a new driver to the operational personnel.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDriver} className="space-y-4 py-4">
             <div className="space-y-2">
                <Label>Full Name</Label>
                <Input name="full_name" placeholder="John Doe" required />
             </div>
             <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input name="phone" placeholder="+255..." required />
             </div>
             <div className="space-y-2">
                <Label>License Class</Label>
                <Input name="license" placeholder="Class E" required />
             </div>
             <DialogFooter className="pt-4">
                <Button type="submit" disabled={createDriverMutation.isPending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  {createDriverMutation.isPending ? "Registering..." : "Add Personnel"}
                </Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmModal 
        isOpen={!!vehicleToDelete}
        onClose={() => setVehicleToDelete(null)}
        onConfirm={() => vehicleToDelete && deleteVehicleMutation.mutate(vehicleToDelete)}
        isDeleting={deleteVehicleMutation.isPending}
        title="Remove Vehicle?"
        description="Are you sure you want to completely remove this vehicle from the fleet? This will detach it from any currently assigned drivers. This action cannot be reversed."
      />

      <DeleteConfirmModal 
        isOpen={!!driverToDelete}
        onClose={() => setDriverToDelete(null)}
        onConfirm={() => driverToDelete && deleteDriverMutation.mutate(driverToDelete)}
        isDeleting={deleteDriverMutation.isPending}
        title="Remove Driver?"
        description="Are you sure you want to remove this driver profile? Any active assignments involving this driver will be unlinked. This action cannot be reversed."
      />
    </div>
  );
}
