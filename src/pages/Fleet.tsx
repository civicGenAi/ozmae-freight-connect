import { PageHeader } from "@/components/PageHeader";
import { TableToolbar } from "@/components/TableToolbar";
import { StatusBadge } from "@/components/StatusBadge";
import { vehicles, drivers } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Fleet() {
  return (
    <div className="space-y-8">
      {/* Vehicles */}
      <div>
        <PageHeader title="Fleet & Drivers" />
        <h3 className="font-semibold text-foreground mb-3">Vehicles</h3>
        <TableToolbar placeholder="Search vehicles..." />
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Job</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((v) => (
                <TableRow key={v.plate}>
                  <TableCell className="font-medium">{v.plate}</TableCell>
                  <TableCell>{v.type}</TableCell>
                  <TableCell>{v.capacity}</TableCell>
                  <TableCell><StatusBadge status={v.status} /></TableCell>
                  <TableCell>{v.currentJob || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Drivers */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Drivers</h3>
        <TableToolbar placeholder="Search drivers..." />
        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>License Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Vehicle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.phone}</TableCell>
                  <TableCell>{d.licenseClass}</TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                  <TableCell>{d.assignedVehicle || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
