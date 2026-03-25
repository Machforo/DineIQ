import { useState, useEffect } from "react";
import { DataTable } from "@/components/DataTable";
import { KPICard } from "@/components/KPICard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Ticket, CheckCircle, XCircle, Clock, Eye, AlertTriangle, RefreshCcw } from "lucide-react";

import { fetchTickets, actionTicket, fetchDashboardList } from "@/api";
import { useAuth } from "@/context/AuthContext";

export default function TicketsPage() {


  const { staff } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [schedule, setSchedule] = useState("IMMEDIATE");
  const [actioning, setActioning] = useState(false);
  const [liveMenu, setLiveMenu] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tList, mList] = await Promise.all([
        fetchTickets(),
        fetchDashboardList("menu")
      ]);
      // Show ALL tickets, including CLOSED ones, to maintain a full history as requested.
      setTickets(tList);
      setLiveMenu(mList);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load tickets", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (action: "APPROVE" | "REJECT" | "REWORK") => {
    if (!staff || !selectedTicket) return;
    setActioning(true);
    try {
      await actionTicket({
        ticket_id: selectedTicket.ticket_id,
        action,
        admin_id: staff.staffId,
        admin_name: staff.name,
        admin_role: staff.role,
        admin_notes: adminNotes,
        publish_schedule: schedule as any
      });
      toast({ title: "Success", description: `Ticket ${action}D successfully.` });
      setSelectedTicket(null);
      setAdminNotes("");
      loadData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setActioning(false);
  };

  const getLiveItem = (itemId: string) => liveMenu.find(i => i.Item_ID === itemId);

  const columns = [
    { key: "ticket_id", label: "ID" },
    { key: "ticket_type", label: "Type", render: (v: string) => (
        <Badge variant={v === "DELETE" ? "destructive" : v === "ADD" ? "default" : "secondary"}>
            {v}
        </Badge>
    )},
    { key: "item_id", label: "Item ID", render: (v: string, row: any) => v || row.proposed_data?.item_id || "-" },
    { key: "ticket_status", label: "Status", render: (v: string) => {
        const colors: any = {
            PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
            APPROVED: "bg-green-100 text-green-800 border-green-200",
            REJECTED: "bg-red-100 text-red-800 border-red-200",
            NEEDS_REWORK: "bg-orange-100 text-orange-800 border-orange-200",
            CLOSED: "bg-muted text-muted-foreground border-border"
        };
        return <Badge className={colors[v] || ""}>{v.replace("_", " ")}</Badge>;
    }},
    { key: "creator_name", label: "Requested By", render: (v: string, row: any) => (
        <div className="flex flex-col">
            <span className="font-medium">{v}</span>
            <span className="text-muted-foreground uppercase">{row.creator_role}</span>
        </div>
    )},
    { key: "acknowledged_by_creator", label: "Acknowledged", render: (v: number) => (
        <Badge variant={v === 1 ? "secondary" : "outline"} className={v === 1 ? "bg-green-50 text-green-700 border-green-100" : ""}>
            {v === 1 ? "Yes" : "No"}
        </Badge>
    )},
    { key: "created_at", label: "Submitted" },

    {
      key: "_actions",
      label: "Review",
      sortable: false,
      render: (_: any, row: any) => (
        <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => setSelectedTicket(row)}>
          <Eye className="h-4 w-4" /> {row.ticket_status === "PENDING" ? "Process" : "View"}
        </Button>
      ),
    },
  ];

  const DiffView = ({ label, proposed, live, showDiff = true }: { label: string, proposed: any, live?: any, showDiff?: boolean }) => {
    const isDifferent = showDiff && live !== undefined && String(proposed) !== String(live);
    return (
      <div className="flex flex-col gap-1 py-1 px-2 rounded hover:bg-muted/50 transition-colors">
        <span className="font-bold uppercase text-muted-foreground">{label}</span>
        <div className="flex items-center justify-between gap-4">
          <span className={`${isDifferent ? "text-blue-600 font-bold" : "text-foreground"}`}>
            {proposed === "ACTIVE" ? "Active" : proposed === "INACTIVE" ? "Inactive" : (proposed || "-")}
          </span>
          {isDifferent && (
            <span className="px-1.5 py-0.5 bg-muted rounded line-through opacity-50">
                {live === "ACTIVE" ? "Active" : live === "INACTIVE" ? "Inactive" : (live || "-")}
            </span>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-muted-foreground">Approve or reject pending menu changes</p>

        </div>

        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={loadData} disabled={loading}>
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total Active" value={tickets.length} icon={Ticket} />
        <KPICard title="Pending Review" value={tickets.filter(t => t.ticket_status === "PENDING").length} icon={Clock} />
        <KPICard title="Acted Upon" value={tickets.filter(t => t.ticket_status !== "PENDING").length} icon={CheckCircle} />
      </div>

      <DataTable data={tickets} columns={columns} searchPlaceholder="Search tickets..." />

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
                <DialogTitle>Ticket: {selectedTicket?.ticket_id}</DialogTitle>
                {selectedTicket && (
                    <Badge variant="outline" className="capitalize">{selectedTicket.ticket_status.replace("_", " ")}</Badge>
                )}
            </div>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Proposed Changes Column */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <div className="h-6 w-1 bg-blue-600 rounded-full" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">Target State</h3>
                  </div>
                  
                  {(() => {
                    const live = getLiveItem(selectedTicket.item_id);
                    const prop = selectedTicket.proposed_data;
                    return (
                        <div className="space-y-1 bg-muted/20 p-2 rounded-lg border border-dashed border-border">
                            <DiffView label="Item Name" proposed={prop.name} live={live?.Item_Name} />
                            <DiffView label="Category" proposed={prop.category} live={live?.Item_Category} />
                            <DiffView label="Description" proposed={prop.description} live={live?.Item_Description} />
                            <DiffView label="Base Price" proposed={prop.base_price} live={live?.Base_Price} />
                            <DiffView label="Current Price" proposed={prop.current_price} live={live?.Current_Price} />
                            <DiffView label="Status" proposed={prop.is_active} live={live?.Is_Active} />
                        </div>
                    );
                  })()}
                </div>

                {/* Audit & Meta Column */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                        <div className="h-6 w-1 bg-muted rounded-full" />
                        <h3 className="font-bold text-sm uppercase tracking-wider">Ticket Info</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">

                        <div>
                            <p className="text-muted-foreground font-medium">Type</p>
                            <p className="font-semibold">{selectedTicket.ticket_type}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground font-medium">Submitted</p>
                            <p className="font-semibold">{selectedTicket.created_at}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground font-medium">Requested By</p>
                            <p className="font-semibold">{selectedTicket.creator_name}</p>
                        </div>
                        {selectedTicket.admin_id && (
                            <div>
                                <p className="text-muted-foreground font-medium">Last Action By</p>
                                <p className="font-semibold">{selectedTicket.admin_name}</p>
                            </div>
                        )}
                    </div>

                    {selectedTicket.admin_notes && (
                        <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                            <p className="font-bold text-orange-800 uppercase mb-1">Admin Feedback</p>

                            <p className="text-sm text-orange-950 italic">"{selectedTicket.admin_notes}"</p>
                        </div>
                    )}
                </div>
              </div>

              {/* Action Controls - Only shown if PENDING */}
              {selectedTicket.ticket_status === "PENDING" && (
                <div className="space-y-4 pt-4 border-t">
                    <div>
                        <Label className="font-bold uppercase text-muted-foreground">Admin Feedback / Instructions</Label>

                        <Textarea 
                            placeholder="Optional: Explain your decision or provide rework instructions..." 
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            className="mt-1"
                            rows={3}
                        />
                    </div>
                    
                    <div>
                        <Label className="font-bold uppercase text-muted-foreground">Execution Strategy</Label>

                        <Select value={schedule} onValueChange={setSchedule}>
                            <SelectTrigger className="w-[220px] mt-1 h-9">
                            <SelectValue placeholder="Select timing" />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="IMMEDIATE">Apply Immediately</SelectItem>
                            <SelectItem value="MIDNIGHT">Stage until Midnight</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-muted-foreground mt-1 px-1">Approved changes will be live once acknowledged by the creator.</p>

                    </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-between pt-4 border-t">
            <Button variant="ghost" onClick={() => setSelectedTicket(null)}>Close</Button>
            
            {selectedTicket?.ticket_status === "PENDING" && (
                <div className="flex gap-2">
                    <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50" onClick={() => handleAction("REWORK")} disabled={actioning}>
                        Needs Rework
                    </Button>
                    <Button variant="destructive" onClick={() => handleAction("REJECT")} disabled={actioning}>
                        Reject
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 font-bold px-6" onClick={() => handleAction("APPROVE")} disabled={actioning}>
                        APPROVE & SHIP
                    </Button>
                </div>
            )}
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}
