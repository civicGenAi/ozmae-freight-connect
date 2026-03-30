import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const users = [
  { name: "Alice Mwakatobe", email: "alice@ozmaefreight.co.tz", role: "Admin", department: "Management", status: "Active" },
  { name: "Sarah Mbeki", email: "sarah@ozmaefreight.co.tz", role: "Sales Manager", department: "Sales", status: "Active" },
  { name: "James Kariuki", email: "james@ozmaefreight.co.tz", role: "Sales Rep", department: "Sales", status: "Active" },
  { name: "Grace Ndulu", email: "grace@ozmaefreight.co.tz", role: "Operations Manager", department: "Operations", status: "Active" },
  { name: "David Otieno", email: "david@ozmaefreight.co.tz", role: "Finance Officer", department: "Finance", status: "Active" },
  { name: "Mary Achieng", email: "mary@ozmaefreight.co.tz", role: "Dispatcher", department: "Operations", status: "Inactive" },
];

export default function UsersRoles() {
  return (
    <div>
      <PageHeader title="Users & Roles">
        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </PageHeader>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.email}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>{u.department}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${u.status === "Active" ? "badge-available" : "badge-off"}`}>
                    {u.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
