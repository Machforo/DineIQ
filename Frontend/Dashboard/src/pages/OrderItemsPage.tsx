import { useState, useEffect } from "react";
import { DataTable } from "@/components/DataTable";
import { KPICard } from "@/components/KPICard";
import { ShoppingCart, Clock, CheckCircle, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parsePrice } from "@/utils/dataUtils";
import { fetchDashboardList } from "@/api";

type OrderItem = {
  order_item_id: string;
  order_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  price: number;
  status: string;
  special_instructions?: string;
};

// Status colors mapping (synced with OrdersPage)
const statusColors: Record<string, string> = {
  SERVED: "bg-green-600",
  READY: "bg-green-500",
  PREPARING: "bg-amber-500",
  PENDING: "bg-blue-500",
  CREATED: "bg-blue-400",
  CANCELLED: "bg-red-500",
  COMPLETED: "bg-gray-500",
};

export default function OrderItemsPage() {
  const [data, setData] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;

  const fetchOrderItems = async () => {
    setLoading(true);
    try {
      const rows = await fetchDashboardList("order_items");
      const normalizedRows: OrderItem[] = rows.map((r: any) => ({
        ...r,
        quantity: parsePrice(r.quantity || r.Item_Quantity),
        price: parsePrice(r.price || r.Item_Price),
      }));
      setData(normalizedRows);
    } catch (err) {
      console.error("Error fetching Order Items:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrderItems();
  }, []);

  const totalItems = data.length;
  const totalQuantity = data.reduce((sum, i) => sum + i.quantity, 0);
  const totalRevenue = data.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const columns = [
    { key: "order_item_id", label: "Item ID" },
    { key: "order_id", label: "Order ID" },
    { key: "item_id", label: "Menu Item ID" },
    { key: "item_name", label: "Name" },
    { key: "quantity", label: "Quantity" },
    { key: "price", label: "Price", render: (v: number) => `KSh ${v}` },
    { key: "Total", label: "Total", render: (_: any, row: OrderItem) => `KSh ${row.price * row.quantity}` },
    { key: "status", label: "Status", render: (v: string) => <Badge className={statusColors[String(v || "PENDING").toUpperCase()] || "bg-gray-400"}>{v || "PENDING"}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order Items</h1>
          <p className="text-muted-foreground">All items for customer orders</p>
        </div>
        <Button onClick={fetchOrderItems} disabled={loading} className="flex items-center gap-2">
          <RefreshCcw size={18} /> {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total Items" value={totalItems} icon={ShoppingCart} />
        <KPICard title="Total Quantity" value={totalQuantity} icon={Clock} />
        <KPICard title="Total Revenue" value={`KSh ${totalRevenue}`} icon={CheckCircle} />
      </div>

      <DataTable data={data} columns={columns} searchPlaceholder="Search order items..." />
    </div>
  );
}
