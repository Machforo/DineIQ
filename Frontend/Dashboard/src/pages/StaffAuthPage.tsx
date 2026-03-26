import { useState, useEffect } from "react";
import { DataTable } from "@/components/DataTable";
import { KPICard } from "@/components/KPICard";
import { Users, ShieldCheck, Clock, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchDashboardList } from "@/api";
import { parseFlexibleDate, parseToDate } from "@/utils/dataUtils";

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

export default function StaffAuthPage() {
  const [data, setData] = useState<StaffAuth[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStaffAuth = async () => {
    setLoading(true);
    try {
      const rows = await fetchDashboardList("staff");

      const normalizedRows: StaffAuth[] = rows.map((r: any) => {
        // Store raw ISO strings for date-based calculations
        r._lastLoginRaw = r.Last_Login_DateTime || "";

        // Normalize date-time fields for display
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
      {/* Header + Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Auth</h1>
          <p className="text-muted-foreground">Staff authentication records</p>
        </div>
        <Button onClick={fetchStaffAuth} disabled={loading} className="flex items-center gap-2">
          <RefreshCcw size={18} /> {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total Staff" value={data.length} icon={Users} />
        <KPICard title="Admins" value={adminCount} icon={ShieldCheck} />
        <KPICard title="Recent Logins (7d)" value={recentLoginsCount} icon={Clock} />
      </div>

      {/* Data Table */}
      <DataTable data={data} columns={columns} searchPlaceholder="Search staff..." />
    </div>
  );
}
