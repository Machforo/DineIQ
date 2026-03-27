import { useState, useEffect, useMemo } from "react";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingCart, DollarSign, Star, Megaphone, MessageCircle } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { parsePrice, parseFlexibleDate, parseToDate, formatDateTime } from "@/utils/dataUtils";
import { fetchDashboardList, fetchAnalyticsSummary } from "@/api";

export default function Analytics() {
  const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;

  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState<any>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [c, o, m, i, cam, ch, oi, summ] = await Promise.all([
        fetchDashboardList("customers"),
        fetchDashboardList("orders"),
        fetchDashboardList("menu"),
        fetchDashboardList("insights"),
        fetchDashboardList("campaigns"),
        fetchDashboardList("chats"),
        fetchDashboardList("order_items"),
        fetchAnalyticsSummary()
      ]);

      setCustomers(c);
      setOrders(o);
      setMenu(m);
      setInsights(i);
      setCampaigns(cam);
      setChats(ch);
      setOrderItems(oi);
      setSummary(summ);
    } catch (err) {
      console.error("Error fetching analytics data:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // KPI calculations
  const totalCustomers = summary?.total_customers ?? customers.length;
  const activeOrders = orders.filter(o => ["Preparing", "Pending"].includes(o.Order_Status || o.status)).length;
  const avgOrderValue = orders.length
    ? Math.round(orders.reduce((sum, o) => sum + parsePrice(o.Order_Price || o.order_price), 0) / orders.length)
    : 0;
  const avgScore = insights.length
    ? Math.round(insights.reduce((sum, i) => sum + parsePrice(i.Customer_Score || i.customer_score), 0) / insights.length)
    : 0;
  const activeCampaigns = campaigns.filter(c => (c.Campaign_Status || c.status) === "ACTIVE").length;
  const chatVolume = chats.length;

  // Charts sample data
  const ordersByDate = orders.map(o => {
    const d = parseToDate(o.Order_Created_DateTime || o.created_at);
    return {
      date: d ? formatDateTime(d).split(",")[0] : "Unknown",
      orders: 1,
      revenue: parsePrice(o.Order_Price || o.order_price),
    };
  }).reduce((acc: any[], cur) => {
    const existing = acc.find(a => a.date === cur.date);
    if (existing) {
      existing.orders += 1;
      existing.revenue += cur.revenue;
    } else acc.push(cur);
    return acc;
  }, []);

  const revenueByCategory = menu.map(m => ({
    category: m.Item_Category || m.category || "Other",
    revenue: parsePrice(m.Current_Price || m.current_price),
  })).reduce((acc: any[], cur) => {
    const existing = acc.find(a => a.category === cur.category);
    if (existing) existing.revenue += cur.revenue;
    else acc.push(cur);
    return acc;
  }, []);

  const categoryDistribution = customers.reduce((acc: any, c) => {
    const cat = c.Customer_Category || c.customer_category || "Unknown";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(categoryDistribution).map(([name, value]) => ({ name, value }));

  const COLORS = [
    "hsl(38, 92%, 50%)",   // Gold
    "hsl(345, 55%, 38%)",  // Deep Crimson
    "hsl(215, 60%, 52%)",  // Royal Blue
    "hsl(150, 50%, 45%)",  // Emerald Green
    "hsl(280, 50%, 50%)",  // Amethyst Purple
    "hsl(25, 90%, 50%)",   // Vibrant Orange
    "hsl(190, 70%, 45%)",  // Teal
    "hsl(320, 60%, 50%)",  // Hot Pink
  ];

  // Calculate Top 5 Selling Items from orderItems data
  const topItems = useMemo(() => {
    if (!orderItems || !orderItems.length) return [];
    
    const aggregated = orderItems.reduce((acc: Record<string, number>, cur) => {
      const name = cur.Item_Name || cur.item_name || "Unknown Item";
      const qty = parsePrice(cur.Item_Quantity || cur.quantity) || 1;
      acc[name] = (acc[name] || 0) + qty;
      return acc;
    }, {});

    return Object.entries(aggregated)
      .map(([name, orders]) => ({ name, orders: orders as number }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);
  }, [orderItems]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics Overview</h1>
        <Button onClick={fetchAll} disabled={loading} className="flex items-center gap-2">
          <RefreshCcw size={18} /> {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Customers" value={totalCustomers} icon={Users} />
        <KPICard title="Active Orders" value={activeOrders} icon={ShoppingCart} />
        <KPICard title="Avg Order Value" value={`KSh ${avgOrderValue}`} icon={DollarSign} />
        <KPICard title="Avg Customer Score" value={avgScore} icon={Star} subtitle="/100" />
        <KPICard title="Active Campaigns" value={activeCampaigns} icon={Megaphone} />
        <KPICard title="Chat Volume" value={chatVolume} icon={MessageCircle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Orders Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={ordersByDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="orders" stroke="hsl(25, 90%, 50%)" fill="hsl(25, 90%, 50%)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={revenueByCategory} margin={{ bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  fontSize={9}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  tick={{ dy: 6 }}
                />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="revenue" fill="hsl(345, 55%, 38%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Customer Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart margin={{ left: 30 }}>
                <Pie data={pieData} cx="40%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ fontSize: "11px", lineHeight: "22px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top 5 Selling Items</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topItems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  fontSize={12}
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.15)]}
                />
                <YAxis type="category" dataKey="name" fontSize={11} width={150} />
                <Tooltip />
                <Bar dataKey="orders" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
