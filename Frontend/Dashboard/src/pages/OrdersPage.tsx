import { useState, useEffect } from "react";
import { DataTable } from "@/components/DataTable";
import { KPICard } from "@/components/KPICard";
import { ShoppingCart, Clock, CheckCircle, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchDashboardList } from "@/api";
import { parsePrice, parseFlexibleDate } from "@/utils/dataUtils";

type Order = {
  order_id: string;
  customer_id: string;
  customer_name: string;
  order_price: number | string;
  created_at: string;
  status: string;
  table_number?: string | number;
  instructions?: string;
};

// Status colors mapping
const statusColors: Record<string, string> = {
  SERVED: "bg-green-600",
  READY: "bg-green-500",
  PREPARING: "bg-amber-500",
  PENDING: "bg-blue-500",
  CREATED: "bg-blue-400",
  CANCELLED: "bg-red-500",
  COMPLETED: "bg-gray-500",
};

export default function OrdersPage() {
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const rows = await fetchDashboardList("orders");

      const normalizedRows: Order[] = rows.map((r: any) => ({
        ...r,
        created_at: parseFlexibleDate(r.created_at || r.Order_Created_DateTime),
        order_price: parsePrice(r.order_price || r.Order_Price),
      }));

      setData(normalizedRows);
    } catch (err) {
      console.error("Error fetching Orders:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const totalOrders = data.length;
  const pendingOrders = data.filter(
    (o) => {
      const s = String(o.status).toUpperCase();
      return s === "PENDING" || s === "PREPARING" || s === "CREATED";
    }
  ).length;
  const avgOrderValue =
    totalOrders > 0
      ? Math.round(
        data.reduce((sum, o) => sum + parsePrice(o.order_price), 0) / totalOrders
      )
      : 0;

  const columns = [
    { key: "order_id", label: "Order ID" },
    { key: "customer_id", label: "Customer ID" },
    { key: "customer_name", label: "Customer" },
    { key: "table_number", label: "Table" },
    { key: "order_price", label: "Price", render: (v: number) => `KSh ${v}` },
    { key: "created_at", label: "Created" },
    {
      key: "status",
      label: "Status",
      render: (v: string) => <Badge className={statusColors[String(v).toUpperCase()] || "bg-gray-400"}>{v}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">All customer orders</p>
        </div>
        <Button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCcw size={18} /> {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total Orders" value={totalOrders} icon={ShoppingCart} />
        <KPICard
          title="Pending / Preparing"
          value={pendingOrders}
          icon={Clock}
        />
        <KPICard title="Avg Order Value" value={`KSh ${avgOrderValue}`} icon={CheckCircle} />
      </div>

      <DataTable
        data={data}
        columns={columns}
        searchPlaceholder="Search orders..."
      />
    </div>
  );
}
