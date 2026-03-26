import { useState, useEffect } from "react";
import { DataTable } from "@/components/DataTable";
import { KPICard } from "@/components/KPICard";
import { Users, ShieldCheck, Clock, RefreshCcw, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { fetchDashboardList, staffRegister } from "@/api";
import { parseFlexibleDate, parseToDate } from "@/utils/dataUtils";
import { useAuth } from "@/context/AuthContext";

type StaffAuth = {
  Staff_ID: string;
  Staff_Name: string;
  Staff_Email: string;
  Staff_Phone: string;
  Staff_Role: string;
  Is_Active: string;
  Creation_DateTime: string;
  Last_Login_DateTime: string;
};

const roleColors: Record<string, string> = {
  admin: "bg-red-600",
  manager: "bg-blue-600",
  chef: "bg-green-600",
  staff: "bg-gray-600",
};

const ROLES = ["admin", "manager", "chef", "staff"] as const;

export default function StaffAuthPage() {
  const { staff: currentStaff } = useAuth();
  const [data, setData] = useState<StaffAuth[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<string>("staff");

  const currentStaff = JSON.parse(localStorage.getItem('staff_user') || '{}');
  const isMasterAdmin = currentStaff?.role === 'master';

  const fetchStaffAuth = async () => {
    setLoading(true);
    try {
      const rows = await fetchDashboardList("staff");

      const normalizedRows: StaffAuth[] = rows.map((r: any) => {
        r._lastLoginRaw = r.Last_Login_DateTime || "";
        ["Creation_DateTime", "Last_Login_DateTime"].forEach((key) => {
          if (r[key]) {
            r[key] = parseFlexibleDate(r[key]);
          }
        });
        return r;
      });

      setData(normalizedRows);
    } catch (err) {
      console.error("Error fetching Staff Auth:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaffAuth();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;
    setSaving(true);
    try {
      await staffRegister({
        name: newName,
        email: newEmail,
        phone: newPhone,
        role: newRole,
      });
      toast({ title: "Staff Added", description: `${newName} has been registered successfully.` });
      setIsAddOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewRole("staff");
      fetchStaffAuth();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const adminCount = data.filter(s => s.Staff_Role === "admin").length;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentLoginsCount = data.filter(s => {
    const raw = (s as any)._lastLoginRaw;
    if (!raw) return false;
    const loginDate = parseToDate(raw);
    return loginDate && loginDate >= sevenDaysAgo;
  }).length;

  const columns = [
    { key: "Staff_ID", label: "ID" },
    { key: "Staff_Name", label: "Name" },
    { key: "Staff_Email", label: "Email" },
    { key: "Staff_Phone", label: "Phone" },
    {
      key: "Staff_Role",
      label: "Role",
      render: (v: string) => <Badge className={`${roleColors[v.toLowerCase()] || ""} capitalize`}>{v}</Badge>,
    },
    {
      key: "Is_Active",
      label: "Status",
      render: (v: string) => (
        <Badge variant={v === "ACTIVE" ? "default" : "destructive"}>{v}</Badge>
      ),
    },
    { key: "Creation_DateTime", label: "Created" },
    { key: "Last_Login_DateTime", label: "Last Login" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Auth</h1>
          <p className="text-muted-foreground">Staff authentication records</p>
        </div>
        <div className="flex items-center gap-2">
          {isMasterAdmin && (
            <Button onClick={() => setIsAddOpen(true)} className="bg-sidebar-primary text-sidebar-primary-foreground flex items-center gap-2">
              <UserPlus size={18} /> Add Staff
            </Button>
          )}
          <Button variant="outline" onClick={fetchStaffAuth} disabled={loading} className="flex items-center gap-2">
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} /> {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total Staff" value={data.length} icon={Users} />
        <KPICard title="Admins" value={adminCount} icon={ShieldCheck} />
        <KPICard title="Recent Logins (7d)" value={recentLoginsCount} icon={Clock} />
      </div>

      <DataTable data={data} columns={columns} searchPlaceholder="Search staff..." />

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. John Doe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work Email *</Label>
              <Input id="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="you@restaurant.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Enter 10-digit number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="role" className="capitalize">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Adding..." : "Confirm & Send Notification"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
