import { useState, useEffect, useMemo } from "react";
import { DataTable } from "@/components/DataTable";
import { KPICard } from "@/components/KPICard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, UtensilsCrossed, RefreshCcw, Clock, AlertCircle, Database } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


import { parsePrice } from "@/utils/dataUtils";
import { fetchDashboardList, submitTicket, fetchTickets, acknowledgeTicket } from "@/api";
import { useAuth } from "@/context/AuthContext";

interface MenuItem {
  Item_ID: string;
  Item_Name: string;
  Item_Category: string;
  Base_Price: number;
  Low_Cap_Price: number;
  High_Cap_Price: number;
  Current_Price: number;
  Item_Description: string;
  Is_Active: string; // "ACTIVE" | "INACTIVE"
  version?: number;
  pending_ticket?: any;
}

const emptyItem: MenuItem = {
  Item_ID: "",
  Item_Name: "",
  Item_Category: "",
  Base_Price: 0,
  Low_Cap_Price: 0,
  High_Cap_Price: 0,
  Current_Price: 0,
  Item_Description: "",
  Is_Active: "ACTIVE",
};

export default function MenuPage() {
  const { staff } = useAuth();
  const [data, setData] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem>(emptyItem);
  const [ackTicket, setAckTicket] = useState<any>(null);
  const [reworkTicketId, setReworkTicketId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const categories = useMemo(() => {
    return Array.from(new Set(data.map(item => item.Item_Category).filter(Boolean))).sort();
  }, [data]);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const [rows, tickets] = await Promise.all([
        fetchDashboardList("menu"),
        fetchTickets() // Fetch all tickets to check for pending ones
      ]);

      const activeTickets = tickets.filter((t: any) => t.ticket_status !== "CLOSED");

      // Normalize and attach pending tickets
      const normalizedData: MenuItem[] = rows.map((i: any) => {
        const itemTicket = activeTickets.find((t: any) => t.item_id === i.Item_ID);
        return {
          ...i,
          Item_ID: i.Item_ID,
          Item_Name: i.Item_Name,
          Item_Category: i.Item_Category,
          Item_Description: i.Item_Description || "",
          Base_Price: parsePrice(i.Base_Price || 0),
          Low_Cap_Price: parsePrice(i.Low_Cap_Price || 0),
          High_Cap_Price: parsePrice(i.High_Cap_Price || 0),
          Current_Price: parsePrice(i.Current_Price || 0),
          Is_Active: String(i.Is_Active || "INACTIVE").toUpperCase(),
          version: i.version || 1,
          pending_ticket: itemTicket,
          Status: itemTicket ? `STAGED: ${itemTicket.ticket_status}` : "LIVE"
        } as MenuItem;
      });



      // Special case: ADD tickets that aren't in the menu yet
      const addTickets = activeTickets.filter((t: any) => t.ticket_type === "ADD");
      const stagedItems: MenuItem[] = addTickets.map((t: any) => ({
        ...t.proposed_data,
        Item_ID: t.proposed_data.item_id,
        Item_Name: t.proposed_data.name,
        Item_Category: t.proposed_data.category,
        Item_Description: t.proposed_data.description || "",
        Base_Price: parsePrice(t.proposed_data.base_price),
        Low_Cap_Price: parsePrice(t.proposed_data.low_cap_price),
        High_Cap_Price: parsePrice(t.proposed_data.high_cap_price),
        Current_Price: parsePrice(t.proposed_data.current_price),
        Is_Active: String(t.proposed_data.is_active || "ACTIVE").toUpperCase(),
        version: 0,
        pending_ticket: t
      }));

      // Combine and remove duplicates (if any)
      const combined = [...stagedItems, ...normalizedData];
      setData(combined);
    } catch (err) {
      console.error("Error fetching Menu:", err);
      toast({ title: "Error", description: "Failed to fetch menu and tickets", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const openAdd = () => {
    const ids = data.map(i => {
      const match = i.Item_ID?.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    });
    const nextId = Math.max(0, ...ids) + 1;
    const formattedId = `Item_${String(nextId).padStart(4, "0")}`;

    setEditItem({ ...emptyItem, Item_ID: formattedId });
    setIsNew(true);
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    if (item.pending_ticket) return; // Prevent editing if already staged
    setEditItem({ ...item });
    setIsNew(false);
    setDialogOpen(true);
  };

  const handleAcknowledge = async (ticketId: string) => {
    try {
      await acknowledgeTicket(ticketId);
      toast({ title: "Acknowledged", description: "Menu updated." });
      fetchMenu();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openRework = (ticket: any) => {
    const stagedData = ticket.proposed_data;
    const row = data.find(i => i.Item_ID === ticket.item_id) || emptyItem;
    
    setEditItem({
        ...row,
        Item_ID: stagedData.item_id || ticket.item_id || row.Item_ID,
        Item_Name: stagedData.name || row.Item_Name,
        Item_Category: stagedData.category || row.Item_Category,
        Item_Description: stagedData.description || row.Item_Description,
        Base_Price: stagedData.base_price || row.Base_Price,
        Low_Cap_Price: stagedData.low_cap_price || row.Low_Cap_Price,
        High_Cap_Price: stagedData.high_cap_price || row.High_Cap_Price,
        Current_Price: stagedData.current_price || row.Current_Price,
        Is_Active: stagedData.is_active || row.Is_Active
    });
    setIsNew(ticket.ticket_type === "ADD");
    setDialogOpen(true);
    setAckTicket(null);
    setReworkTicketId(ticket.ticket_id);
  };



  const handleTicketSubmit = async (type: "ADD" | "EDIT" | "DELETE", item: MenuItem) => {
    if (!staff) return;

    setSaving(true);
    try {
      const proposedData = {
        item_id: item.Item_ID,
        name: item.Item_Name,
        category: item.Item_Category,
        base_price: item.Base_Price,
        low_cap_price: item.Low_Cap_Price,
        high_cap_price: item.High_Cap_Price,
        current_price: item.Current_Price,
        description: item.Item_Description,
        is_active: item.Is_Active
      };

      await submitTicket({
        ticket_type: type,
        item_id: item.Item_ID, // Always pass ID
        rework_ticket_id: reworkTicketId || undefined,
        proposed_data: proposedData,
        creator_id: staff.staffId,
        creator_name: staff.name,
        creator_role: staff.role
      });

      toast({ title: "Ticket Submitted", description: `Request to ${type.toLowerCase()} ${item.Item_Name} is pending admin approval.` });
      setDialogOpen(false);
      setReworkTicketId(null);
      fetchMenu();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const columns = [
    {
      key: "Item_ID", label: "ID", render: (v: string, row: MenuItem) => (
        <div className={row.pending_ticket ? "opacity-40" : ""}>{v}</div>
      )
    },


    {
      key: "Item_Name", label: "Name", render: (v: string, row: MenuItem) => (
        <div className={row.pending_ticket ? "opacity-40" : ""}>{v}</div>
      )
    },

    {
      key: "Item_Category", label: "Category", render: (v: string, row: MenuItem) => (
        <div className={row.pending_ticket ? "opacity-40" : ""}>{v}</div>
      )
    },
    {
      key: "Item_Description", label: "Description", render: (v: string, row: MenuItem) => (
        <div className={`max-w-[150px] overflow-x-auto whitespace-nowrap pb-1 ${row.pending_ticket ? "opacity-40" : ""}`}>
          {v || "-"}
        </div>
      )
    },

    {
      key: "Base_Price", label: "Base Price", render: (v: number, row: MenuItem) => (
        <div className={row.pending_ticket ? "opacity-40" : ""}>{v}</div>
      )
    },
    {
      key: "Low_Cap_Price", label: "Low Cap", render: (v: number, row: MenuItem) => (
        <div className={row.pending_ticket ? "opacity-40" : ""}>{v}</div>
      )
    },
    {
      key: "High_Cap_Price", label: "High Cap", render: (v: number, row: MenuItem) => (
        <div className={row.pending_ticket ? "opacity-40" : ""}>{v}</div>
      )
    },
    {
      key: "Current_Price", label: "Current Price", render: (v: number, row: MenuItem) => (
        <div className={row.pending_ticket ? "opacity-40" : ""}>KSh {v}</div>
      )
    },
    {
      key: "Is_Active",
      label: "Status",
      render: (v: string, row: MenuItem) => (
        <div className={row.pending_ticket ? "opacity-40" : ""}>
          {v === "ACTIVE" ? <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
        </div>
      ),
    },
    { key: "version", label: "Version", render: (v: number, row: MenuItem) => <span className={`text-muted-foreground ${row.pending_ticket ? "opacity-40" : ""}`}>v{v}</span> },


    {
      key: "Status",
      label: "Workflow",
      render: (_: any, row: MenuItem) => {
        if (!row.pending_ticket) return <Badge variant="outline">Live</Badge>;

        const t = row.pending_ticket;
        if (t.ticket_status === "PENDING") return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> Staged: {t.ticket_type}
          </Badge>
        );

        if (t.ticket_status === "APPROVED") return (
          <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => setAckTicket(t)}>
            Apply
          </Button>
        );

        if (t.ticket_status === "REJECTED") return (
          <Button size="sm" variant="destructive" onClick={() => setAckTicket(t)}>
            Ack
          </Button>
        );

        if (t.ticket_status === "NEEDS_REWORK") return (
          <Button size="sm" variant="outline" className="border-orange-500 text-orange-600" onClick={() => setAckTicket(t)}>
            Rework
          </Button>
        );


        return <Badge>{t.ticket_status}</Badge>;
      }
    },

    {
      key: "_actions",
      label: "Actions",
      sortable: false,
      render: (_: any, row: MenuItem) => (
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)} disabled={!!row.pending_ticket}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Update</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTicketSubmit("DELETE", row)} disabled={!!row.pending_ticket}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

      ),
    },
  ];


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu</h1>
          <p className="text-muted-foreground">Manage your restaurant menu items</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled className="opacity-50">
            <Database className="h-4 w-4 mr-2" /> Sync from Harvest
          </Button>

          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>

          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={fetchMenu} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
          </Button>


        </div>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Live Items" value={data.filter(i => !i.pending_ticket).length} icon={UtensilsCrossed} />
        <KPICard title="Pending Approval" value={data.filter(i => i.pending_ticket?.ticket_status === "PENDING").length} icon={Clock} />
        <KPICard title="Needs Action" value={data.filter(i => i.pending_ticket && i.pending_ticket.ticket_status !== "PENDING").length} icon={AlertCircle} />
      </div>

      <DataTable data={data} columns={columns} searchPlaceholder="Search menu items..." />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isNew ? "Draft New Item" : `Rework: ${editItem.Item_Name}`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Item ID</Label>
                <Input value={editItem.Item_ID} disabled />
              </div>
              <div>
                <Label>Name</Label>
                <Input value={editItem.Item_Name} onChange={(e) => setEditItem({ ...editItem, Item_Name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Input 
                  list="category-options"
                  value={editItem.Item_Category} 
                  onChange={(e) => setEditItem({ ...editItem, Item_Category: e.target.value })} 
                />
                <datalist id="category-options">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={editItem.Is_Active === "ACTIVE"}
                  onCheckedChange={(c) => setEditItem({ ...editItem, Is_Active: c ? "ACTIVE" : "INACTIVE" })}
                />
                <Label>Active Status</Label>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editItem.Item_Description}
                onChange={(e) => setEditItem({ ...editItem, Item_Description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Base Price (KSh)</Label>
                <Input type="number" value={editItem.Base_Price} onChange={(e) => setEditItem({ ...editItem, Base_Price: +e.target.value })} />
              </div>
              <div>
                <Label>Current Price (KSh)</Label>
                <Input type="number" value={editItem.Current_Price} onChange={(e) => setEditItem({ ...editItem, Current_Price: +e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Low Cap (KSh)</Label>
                <Input type="number" value={editItem.Low_Cap_Price} onChange={(e) => setEditItem({ ...editItem, Low_Cap_Price: +e.target.value })} />
              </div>
              <div>
                <Label>High Cap (KSh)</Label>
                <Input type="number" value={editItem.High_Cap_Price} onChange={(e) => setEditItem({ ...editItem, High_Cap_Price: +e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => handleTicketSubmit(isNew ? "ADD" : "EDIT", editItem)} disabled={saving}>
              {saving ? "Submitting..." : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!ackTicket} onOpenChange={(open) => !open && setAckTicket(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Acknowledgment</DialogTitle>
          </DialogHeader>
          {ackTicket && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/30 rounded-lg border space-y-2">
                <p><strong>Ticket ID:</strong> {ackTicket.ticket_id}</p>
                <p><strong>Admin Decision:</strong> <Badge variant={ackTicket.ticket_status === "APPROVED" ? "default" : "destructive"}>{ackTicket.ticket_status}</Badge></p>
                {ackTicket.admin_notes && (
                  <p className="pt-2 text-sm italic">" {ackTicket.admin_notes} "</p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {ackTicket.ticket_status === "APPROVED" 
                   ? "By acknowledging, you are applying these changes to the live menu." 
                   : "By acknowledging, you are closing this request."}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckTicket(null)}>Cancel</Button>
            {ackTicket?.ticket_status === "NEEDS_REWORK" ? (
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => openRework(ackTicket)}>
                    Edit & Resubmit
                </Button>
            ) : (
                <Button className={ackTicket?.ticket_status === "APPROVED" ? "bg-green-600 hover:bg-green-700" : ""} onClick={() => {
                    handleAcknowledge(ackTicket.ticket_id);
                    setAckTicket(null);
                }}>
                    Confirm & Close
                </Button>
            )}
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}

