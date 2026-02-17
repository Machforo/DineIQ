import { useState, useEffect, useMemo } from "react";
import { DataTable } from "@/components/DataTable";
import { KPICard } from "@/components/KPICard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, CheckCircle, Clock, RefreshCcw } from "lucide-react";
import { parseGVizJson } from "@/utils/parseGVizJson";

type Campaign = {
  Campaign_ID: string;
  Campaign_Text: string;
  Target_Customer_Category: string;
  Campaign_Start_DateTime: string;
  Campaign_End_DateTime: string;
  Campaign_Message_Count: number;
  Campaign_Type: string;
  Campaign_Status: string;
  [key: string]: any; // for Message_Template #1..#10 and Message_Send_Timing #1..#10
};

const statusColors: Record<string, string> = {
  Active: "bg-green-600",
  Scheduled: "bg-blue-500",
  Completed: "bg-gray-500",
};

export default function CampaignsPage() {
  const [data, setData] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Campaigns`
      );
      const text = await res.text();
      const json = JSON.parse(text.substr(47).slice(0, -2));
      const cols = json.table.cols.map((c: any) => c.label);
      const rows: Campaign[] = parseGVizJson(json, "Campaigns").map((r: any) => {
        const obj: any = {};
        cols.forEach((col: string) => {
          obj[col] = r[col] ?? "";
        });

        // Parse actual date-time columns
        obj.Campaign_Start_DateTime = obj.Campaign_Start_DateTime
          ? new Date(String(obj.Campaign_Start_DateTime)).toLocaleString()
          : "";
        obj.Campaign_End_DateTime = obj.Campaign_End_DateTime
          ? new Date(String(obj.Campaign_End_DateTime)).toLocaleString()
          : "";

        // Message_Send_Timing #1..#10 remain as HH:mm string
        return obj;
      });
      setData(rows);
    } catch (err) {
      console.error("Error fetching Campaigns:", err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const active = data.filter(c => c.Campaign_Status === "Active").length;
  const scheduled = data.filter(c => c.Campaign_Status === "Scheduled").length;

  // Build columns dynamically
  const columns = useMemo(() => {
    const base = [
      { key: "Campaign_ID", label: "ID" },
      { key: "Campaign_Text", label: "Campaign Text", render: (v: string) => <div className="max-w-[250px] overflow-auto max-h-[80px] text-sm">{v}</div> },
      { key: "Target_Customer_Category", label: "Target" },
      { key: "Campaign_Start_DateTime", label: "Start" },
      { key: "Campaign_End_DateTime", label: "End" },
      { key: "Campaign_Message_Count", label: "Messages" },
      { key: "Campaign_Type", label: "Type" },
      { key: "Campaign_Status", label: "Status", render: (v: string) => <Badge className={statusColors[v] || ""}>{v}</Badge> },
    ];

    for (let i = 1; i <= 10; i++) {
      const tKey = `Message_Template #${i}`;
      const sKey = `Message_Send_Timing #${i}`;
      const hasData = data.some((c) => c[tKey]);
      if (hasData) {
        base.push({
          key: tKey,
          label: `Template #${i}`,
          render: (v: string) => <div className="max-w-[200px] overflow-auto max-h-[80px] text-sm">{v || "—"}</div>,
        });
        base.push({
          key: sKey,
          label: `Timing #${i}`,
          render: (v: string) => <span>{v || "—"}</span>, // HH:mm as-is
        });
      }
    }
    return base;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Marketing campaigns and messaging</p>
        </div>
        <Button onClick={fetchCampaigns} disabled={loading} className="flex items-center gap-2">
          <RefreshCcw size={18} /> {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total Campaigns" value={data.length} icon={Megaphone} />
        <KPICard title="Active" value={active} icon={CheckCircle} />
        <KPICard title="Scheduled" value={scheduled} icon={Clock} />
      </div>

      <DataTable data={data} columns={columns} searchPlaceholder="Search campaigns..." />
    </div>
  );
}
