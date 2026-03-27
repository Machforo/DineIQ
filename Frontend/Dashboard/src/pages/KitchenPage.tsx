import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchKitchenOrders, updateKitchenItemStatus, updateKitchenOrderStatus } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/KPICard";
import { toast } from "@/hooks/use-toast";
import {
  RefreshCcw, Clock, AlertTriangle, CheckCircle2, ChefHat,
  Play, Check, LayoutList, LayoutGrid, ArrowDownUp,
  Utensils, Timer, ChevronDown, ChevronUp, MonitorCheck,
  Activity, UtensilsCrossed,
} from "lucide-react";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface KitchenItem {
  order_item_id: string;
  item_id: string;
  item_name: string;
  item_category: string;
  quantity: number;
  price: number;
  item_status: "PENDING" | "PREPARING" | "READY";
  special_instructions: string;
}

interface KitchenOrder {
  order_id: string;
  table_number: string | number;
  order_status: "PENDING" | "PREPARING" | "READY" | "CREATED" | "SERVED" | "CANCELLED";
  instructions: string;
  created_at: string;
  elapsed_minutes: number;
  is_delayed: boolean;
  items: KitchenItem[];
}

type SortOption = "time" | "order" | "status" | "category";
type FilterOption = "all" | "delayed" | "active" | "completed";
type ItemStatus = "PENDING" | "PREPARING" | "READY";

// ─────────────────────────────────────────────────────────
// Helpers — light-mode status styles matching TicketsPage
// ─────────────────────────────────────────────────────────
const STATUS_RANK: Record<ItemStatus, number> = { PENDING: 0, PREPARING: 1, READY: 2 };

function statusBadgeClass(s: string) {
  if (s === "READY")     return "bg-green-100 text-green-800 border-green-200";
  if (s === "PREPARING") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-muted text-muted-foreground border-border";  // PENDING
}

function orderCardClass(o: KitchenOrder) {
  if (o.order_status === "READY")     return "bg-green-50 border-green-400 ring-1 ring-green-500";
  if (o.order_status === "PREPARING") return "bg-yellow-50 border-yellow-400 ring-1 ring-yellow-500";
  if (o.is_delayed)                   return "bg-red-50 border-red-300 ring-1 ring-red-400";
  return "bg-card border-border";
}

function orderHeaderClass(o: KitchenOrder) {
  if (o.order_status === "READY")     return "bg-green-100 border-b border-green-200";
  if (o.order_status === "PREPARING") return "bg-yellow-100/80 border-b border-yellow-200";
  if (o.is_delayed)                   return "bg-red-100 border-b border-red-300";
  return "bg-muted/50 border-b border-border";
}

// ─────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const icons: Record<string, JSX.Element> = {
    PENDING:   <Clock className="h-3 w-3" />,
    PREPARING: <ChefHat className="h-3 w-3" />,
    READY:     <CheckCircle2 className="h-3 w-3" />,
  };
  return (
    <Badge className={`flex items-center gap-1 ${statusBadgeClass(status)}`}>
      {icons[status] ?? null}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}

function TitleWithStatus({ name, status, isDelayed, isBold = true }: { name: string; status: string; isDelayed: boolean; isBold?: boolean }) {
  let dot = "⚪"; let color = "text-foreground";
  if (status === "READY") { dot = "🟢"; color = "text-green-800"; }
  else if (status === "PREPARING") { dot = "🟡"; color = "text-yellow-700"; }
  else if (isDelayed) { dot = "🔴"; color = "text-red-700"; }

  const showWarn = isDelayed && status !== "READY";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={`flex items-center gap-1 ${isBold ? 'font-bold' : 'font-semibold'} text-sm ${color}`}>
        <span>{dot}</span>
        <span>{name}</span>
      </span>
      {showWarn && <AlertTriangle className="h-4 w-4 text-red-500" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Item action buttons
// ─────────────────────────────────────────────────────────
function ItemActionButtons({
  item,
  onUpdate,
  loading,
}: {
  item: KitchenItem;
  onUpdate: (id: string, status: ItemStatus) => void;
  loading: boolean;
}) {
  return (
    <div className="flex gap-1.5 flex-shrink-0">
      {item.item_status === "PENDING" && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-yellow-400 text-yellow-700 hover:bg-yellow-50"
          disabled={loading}
          onClick={() => onUpdate(item.order_item_id, "PREPARING")}
        >
          <Play className="h-3 w-3 mr-1" /> Start
        </Button>
      )}
      {item.item_status !== "READY" && (
        <Button
          size="sm"
          className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
          disabled={loading}
          onClick={() => onUpdate(item.order_item_id, "READY")}
        >
          <Check className="h-3 w-3 mr-1" /> Ready
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Toolbar pill group (sort / filter)
// ─────────────────────────────────────────────────────────
function ToolbarPills<T extends string>({
  options,
  active,
  onSelect,
  label,
}: {
  options: { value: T; label: string }[];
  active: T;
  onSelect: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {label && (
        <span className="text-xs text-muted-foreground font-medium mr-1 flex items-center gap-1">
          <ArrowDownUp className="h-3 w-3" /> {label}
        </span>
      )}
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onSelect(o.value)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            active === o.value
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-background text-muted-foreground border-border hover:border-blue-400 hover:text-blue-600"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ADMIN VIEW
// ─────────────────────────────────────────────────────────
function AdminView({
  orders, sort, setSort, filter, setFilter,
}: {
  orders: KitchenOrder[];
  sort: SortOption; setSort: (s: SortOption) => void;
  filter: FilterOption; setFilter: (f: FilterOption) => void;
}) {
  const filtered = useMemo(() => {
    let list = [...orders];
    if (filter === "delayed")   list = list.filter(o => o.is_delayed);
    if (filter === "active")    list = list.filter(o => o.order_status !== "READY");
    if (filter === "completed") list = list.filter(o => o.order_status === "READY");
    // Sort AFTER filter
    if (sort === "time")   list.sort((a, b) => b.elapsed_minutes - a.elapsed_minutes);  // oldest first
    if (sort === "order")  list.sort((a, b) => a.order_id.localeCompare(b.order_id));
    if (sort === "status") list.sort((a, b) => (STATUS_RANK[a.order_status as ItemStatus] || 0) - (STATUS_RANK[b.order_status as ItemStatus] || 0)); // PENDING→PREPARING→READY
    return list;
  }, [orders, sort, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <ToolbarPills
          label="Sort"
          active={sort}
          onSelect={setSort}
          options={[
            { value: "time",   label: "⏰ By Time" },
            { value: "order",  label: "# By Order" },
            { value: "status", label: "By Status" },
          ]}
        />
        <div className="ml-auto">
          <ToolbarPills
            active={filter}
            onSelect={setFilter}
            options={[
              { value: "all",       label: "All Orders" },
              { value: "delayed",   label: "🔴 Delayed" },
              { value: "active",    label: "Active" },
              { value: "completed", label: "Completed" },
            ]}
          />
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <MonitorCheck className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p>No orders to display</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(order => (
          <div key={order.order_id} className={`rounded-xl border-2 overflow-hidden transition-colors ${orderCardClass(order)}`}>
            <div className={`px-4 py-3 flex items-center justify-between ${orderHeaderClass(order)}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <TitleWithStatus name={order.order_id} status={order.order_status} isDelayed={order.is_delayed} />
                <span className="text-muted-foreground text-xs">| Table {order.table_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={order.order_status} />
                <Badge className={`text-xs ${order.order_status === "READY" ? "bg-green-200 text-green-900 border-green-300" : order.is_delayed ? "bg-red-100 text-red-800 border-red-200" : order.order_status === "PREPARING" ? "bg-yellow-200 text-yellow-900 border-yellow-300" : "bg-muted text-muted-foreground border-border"}`}>
                  <Timer className="h-3 w-3 mr-1" />{order.elapsed_minutes} min
                </Badge>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {order.items.map(item => (
                <div key={item.order_item_id} className="flex items-start justify-between py-1.5 border-b border-border last:border-0 gap-2">
                  <div>
                    <span className="text-sm font-medium">{item.item_name}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">×{item.quantity}</span>
                    {item.special_instructions && (
                      <p className="text-xs text-orange-600 mt-0.5 italic">{item.special_instructions}</p>
                    )}
                  </div>
                  <StatusBadge status={item.item_status} />
                </div>
              ))}
              {order.instructions && (
                <p className="text-xs text-orange-700 pt-1 italic border-t border-border">
                  📝 {order.instructions}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// CHEF VIEW
// ─────────────────────────────────────────────────────────
function ChefView({
  orders, sort, setSort, onItemUpdate, onOrderServed, loadingIds,
}: {
  orders: KitchenOrder[];
  sort: SortOption; setSort: (s: SortOption) => void;
  onItemUpdate: (id: string, status: ItemStatus) => void;
  onOrderServed: (orderId: string) => void;
  loadingIds: Set<string>;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    let list = [...orders];
    if (sort === "time")   list.sort((a, b) => b.elapsed_minutes - a.elapsed_minutes); // oldest/most urgent first
    if (sort === "order")  list.sort((a, b) => a.order_id.localeCompare(b.order_id));
    if (sort === "status") list.sort((a, b) => (STATUS_RANK[a.order_status as ItemStatus] || 0) - (STATUS_RANK[b.order_status as ItemStatus] || 0)); // PENDING first
    if (sort === "category") {
      // Delayed orders bubble to very top regardless, then by elapsed time
      list.sort((a, b) => {
        if (a.is_delayed !== b.is_delayed) return a.is_delayed ? -1 : 1;
        return b.elapsed_minutes - a.elapsed_minutes;
      });
    }
    return list;
  }, [orders, sort]);

  const toggle = (id: string) =>
    setCollapsed(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <ToolbarPills
          label="Sort"
          active={sort}
          onSelect={setSort}
          options={[
            { value: "order",    label: "# Order" },
            { value: "time",     label: "⏰ Time" },
            { value: "status",   label: "Status" },
            { value: "category", label: "Category" },
          ]}
        />
        <Button
          variant="outline"
          size="sm"
          className="ml-auto text-xs"
          onClick={() => setCollapsed(new Set(sorted.filter(o => o.order_status === "READY").map(o => o.order_id)))}
        >
          <ChevronUp className="h-3 w-3 mr-1" /> Collapse Done
        </Button>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ChefHat className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p>Kitchen is clear!</p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map(order => {
          const isCollapsed = collapsed.has(order.order_id);
          return (
            <div
              key={order.order_id}
              className={`rounded-xl border-2 overflow-hidden transition-colors ${orderCardClass(order)}`}
            >
              {/* Header */}
              <div
                className={`px-4 py-3 flex items-center justify-between cursor-pointer ${orderHeaderClass(order)}`}
                onClick={() => toggle(order.order_id)}
              >
                <div className="flex items-center gap-2.5 flex-wrap">
                  <TitleWithStatus name={order.order_id} status={order.order_status} isDelayed={order.is_delayed} />
                  <span className="text-muted-foreground text-xs">| Table {order.table_number}</span>
                  <StatusBadge status={order.order_status} />
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${order.order_status === "READY" ? "bg-green-200 text-green-900 border-green-300" : order.is_delayed ? "bg-red-100 text-red-800 border-red-200" : order.order_status === "PREPARING" ? "bg-yellow-200 text-yellow-900 border-yellow-300" : "bg-muted text-muted-foreground border-border"}`}>
                    <Timer className="h-3 w-3 mr-1" />{order.elapsed_minutes} min
                  </Badge>
                  {order.order_status === "READY" && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                      onClick={e => { e.stopPropagation(); onOrderServed(order.order_id); }}
                      disabled={loadingIds.has(order.order_id)}
                    >
                      Mark Served
                    </Button>
                  )}
                  {isCollapsed
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {!isCollapsed && (
                <div className="p-4 space-y-2">
                  {order.instructions && (
                    <div className="text-xs text-orange-800 p-2 bg-orange-50 rounded-lg border border-orange-100 italic">
                      📝 Order Note: {order.instructions}
                    </div>
                  )}
                  {order.items.map(item => (
                    <div
                      key={item.order_item_id}
                      className={`p-3 rounded-lg border flex items-start justify-between gap-2 ${
                        item.item_status === "READY"
                          ? "bg-green-50 border-green-200 opacity-70"
                          : item.item_status === "PREPARING"
                          ? "bg-yellow-50 border-yellow-200"
                          : "bg-background border-border"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{item.item_name}</span>
                          <Badge variant="secondary" className="text-xs">×{item.quantity}</Badge>
                          <StatusBadge status={item.item_status} />
                        </div>
                        {item.special_instructions && (
                          <p className="text-xs text-orange-600 mt-1 italic">⚠ {item.special_instructions}</p>
                        )}
                      </div>
                      <ItemActionButtons item={item} onUpdate={onItemUpdate} loading={loadingIds.has(item.order_item_id)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// STAFF VIEW
// ─────────────────────────────────────────────────────────
function StaffView({
  orders, onItemUpdate, loadingIds,
}: {
  orders: KitchenOrder[];
  onItemUpdate: (id: string, status: ItemStatus) => void;
  loadingIds: Set<string>;
}) {
  const [viewMode, setViewMode] = useState<"item" | "category" | "batch">("item");

  const flatItems = useMemo(() => {
    const all: (KitchenItem & { order_id: string; table_number: string | number; is_delayed: boolean })[] = [];
    for (const order of orders) {
      for (const item of order.items) {
        all.push({ ...item, order_id: order.order_id, table_number: order.table_number, is_delayed: order.is_delayed });
      }
    }
    return all.sort((a, b) => STATUS_RANK[a.item_status] - STATUS_RANK[b.item_status]);
  }, [orders]);

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof flatItems>();
    for (const item of flatItems) {
      const cat = item.item_category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    // Sort within each category: PENDING → PREPARING → READY
    for (const [, items] of map) {
      items.sort((a, b) => STATUS_RANK[a.item_status] - STATUS_RANK[b.item_status]);
    }
    return map;
  }, [flatItems]);

  const byBatch = useMemo(() => {
    const map = new Map<string, typeof flatItems>();
    for (const item of flatItems) {
      if (!map.has(item.item_name)) map.set(item.item_name, []);
      map.get(item.item_name)!.push(item);
    }
    const groups = Array.from(map.entries()).map(([name, items]) => {
      const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
      return { name, totalQty, items };
    });
    // Sort max to min overall batch quantity
    groups.sort((a, b) => b.totalQty - a.totalQty);
    for (const g of groups) {
      g.items.sort((a, b) => STATUS_RANK[a.item_status] - STATUS_RANK[b.item_status]);
    }
    return groups;
  }, [flatItems]);

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === "item" ? "default" : "outline"}
          size="sm"
          className={`text-xs ${viewMode === "item" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
          onClick={() => setViewMode("item")}
        >
          <LayoutList className="h-3.5 w-3.5 mr-1" /> Item List
        </Button>
        <Button
          variant={viewMode === "category" ? "default" : "outline"}
          size="sm"
          className={`text-xs ${viewMode === "category" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
          onClick={() => setViewMode("category")}
        >
          <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Category View
        </Button>
        <Button
          variant={viewMode === "batch" ? "default" : "outline"}
          size="sm"
          className={`text-xs ${viewMode === "batch" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
          onClick={() => setViewMode("batch")}
        >
          <Utensils className="h-3.5 w-3.5 mr-1" /> Batch Prep
        </Button>
      </div>

      {flatItems.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Utensils className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p>Nothing to prepare right now</p>
        </div>
      )}

      {/* Item List */}
      {viewMode === "item" && (
        <div className="space-y-2">
          {flatItems.map(item => (
            <div
              key={item.order_item_id}
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                item.item_status === "READY"
                  ? "bg-green-50 border-green-400 ring-1 ring-green-500"
                  : item.item_status === "PREPARING"
                  ? "bg-yellow-50 border-yellow-400 ring-1 ring-yellow-500"
                  : item.is_delayed
                  ? "bg-red-50 border-red-300 ring-1 ring-red-400"
                  : "bg-card border-border"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <TitleWithStatus name={item.item_name} status={item.item_status} isDelayed={item.is_delayed} />
                  <Badge variant="secondary" className="text-xs">×{item.quantity}</Badge>
                  <StatusBadge status={item.item_status} />
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span>{item.order_id}</span>
                  <span>·</span>
                  <span>Table {item.table_number}</span>
                  {item.special_instructions && (
                    <>
                      <span>·</span>
                      <span className="text-orange-600 italic">⚠ {item.special_instructions}</span>
                    </>
                  )}
                </div>
              </div>
              <ItemActionButtons item={item} onUpdate={onItemUpdate} loading={loadingIds.has(item.order_item_id)} />
            </div>
          ))}
        </div>
      )}

      {/* Category View */}
      {viewMode === "category" && (
        <div className="space-y-6">
          {Array.from(byCategory.entries()).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-border" />
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 uppercase tracking-wider text-xs">
                  {category}
                </Badge>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {items.map(item => (
                  <div
                    key={item.order_item_id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                      item.item_status === "READY"
                        ? "bg-green-50 border-green-400 ring-1 ring-green-500"
                        : item.item_status === "PREPARING"
                        ? "bg-yellow-50 border-yellow-400 ring-1 ring-yellow-500"
                        : item.is_delayed
                        ? "bg-red-50 border-red-300 ring-1 ring-red-400"
                        : "bg-card border-border"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TitleWithStatus name={item.item_name} status={item.item_status} isDelayed={item.is_delayed} isBold={false} />
                        <Badge variant="secondary" className="text-xs">×{item.quantity}</Badge>
                        <span className="text-xs text-muted-foreground">({item.order_id} · Table {item.table_number})</span>
                        <StatusBadge status={item.item_status} />
                      </div>
                      {item.special_instructions && (
                        <p className="text-xs text-orange-600 mt-0.5 italic">⚠ {item.special_instructions}</p>
                      )}
                    </div>
                    <ItemActionButtons item={item} onUpdate={onItemUpdate} loading={loadingIds.has(item.order_item_id)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Batch Prep View */}
      {viewMode === "batch" && (
        <div className="space-y-6">
          {byBatch.map(({ name, totalQty, items }) => (
            <div key={name}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-border" />
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 tracking-wider text-xs flex gap-2 items-center">
                  <span className="font-bold">{name}</span>
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-purple-200 text-purple-900 border-purple-300">
                    Total: {totalQty}
                  </Badge>
                </Badge>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {items.map(item => (
                  <div
                    key={item.order_item_id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors ${
                      item.item_status === "READY"
                        ? "bg-green-50 border-green-400 ring-1 ring-green-500"
                        : item.item_status === "PREPARING"
                        ? "bg-yellow-50 border-yellow-400 ring-1 ring-yellow-500"
                        : item.is_delayed
                        ? "bg-red-50 border-red-300 ring-1 ring-red-400"
                        : "bg-card border-border"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TitleWithStatus name={item.item_name} status={item.item_status} isDelayed={item.is_delayed} isBold={false} />
                        <Badge variant="secondary" className="text-xs">×{item.quantity}</Badge>
                        <span className="text-xs text-muted-foreground">({item.order_id} · Table {item.table_number})</span>
                        <StatusBadge status={item.item_status} />
                      </div>
                      {item.special_instructions && (
                        <p className="text-xs text-orange-600 mt-0.5 italic">⚠ {item.special_instructions}</p>
                      )}
                    </div>
                    <ItemActionButtons item={item} onUpdate={onItemUpdate} loading={loadingIds.has(item.order_item_id)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main KitchenPage
// ─────────────────────────────────────────────────────────
const POLL_INTERVAL = 15_000;

export default function KitchenPage() {
  const { staff } = useAuth();
  const role = (staff?.role ?? "staff").toLowerCase() as "admin" | "chef" | "staff" | "master";

  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const [adminSort, setAdminSort] = useState<SortOption>("time");
  const [chefSort, setChefSort] = useState<SortOption>("order");
  const [filter, setFilter] = useState<FilterOption>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchKitchenOrders();
      setOrders(res.orders ?? []);
      setLastRefresh(new Date());
    } catch (err: any) {
      toast({ title: "Kitchen Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  const handleItemUpdate = useCallback(async (orderItemId: string, status: ItemStatus) => {
    setLoadingIds(prev => new Set(prev).add(orderItemId));
    try {
      await updateKitchenItemStatus(orderItemId, status);
      setOrders(prev =>
        prev.map(order => ({
          ...order,
          items: order.items.map(item =>
            item.order_item_id === orderItemId ? { ...item, item_status: status } : item
          ),
        }))
      );
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoadingIds(prev => { const n = new Set(prev); n.delete(orderItemId); return n; });
    }
  }, []);

  const handleOrderServed = useCallback(async (orderId: string) => {
    setLoadingIds(prev => new Set(prev).add(orderId));
    try {
      await updateKitchenOrderStatus(orderId, "SERVED");
      setOrders(prev => prev.filter(o => o.order_id !== orderId));
      toast({ title: "Order Served", description: `${orderId} marked as served.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingIds(prev => { const n = new Set(prev); n.delete(orderId); return n; });
    }
  }, []);

  // KPI numbers
  const inPipeline = orders.filter(o => o.order_status !== "READY").length;
  const delayed    = orders.filter(o => o.is_delayed).length;
  const ready      = orders.filter(o => o.order_status === "READY").length;

  const roleLabel: Record<string, string> = {
    admin: "Monitor View", master: "Monitor View", chef: "Control Tower", staff: "Execution Mode",
  };

  return (
    <div className="space-y-6">
      {/* Header — identical pattern to TicketsPage */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Kitchen</h1>
            <Badge variant="outline" className="capitalize">{roleLabel[role] ?? role}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Auto-refreshes every 15s · Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={load}
          disabled={loading}
        >
          <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* KPI Cards — Admin & Chef only */}
      {(role === "admin" || role === "chef" || role === "master") && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KPICard title="In Pipeline"  value={inPipeline} icon={Activity} />
          <KPICard title="Delayed (>20min)" value={delayed}    icon={AlertTriangle} />
          <KPICard title="Ready to Serve"  value={ready}     icon={UtensilsCrossed} />
        </div>
      )}

      {/* Role views */}
      {(role === "admin" || role === "master") && (
        <AdminView
          orders={orders} sort={adminSort} setSort={setAdminSort} filter={filter} setFilter={setFilter}
        />
      )}
      {role === "chef" && (
        <ChefView
          orders={orders} sort={chefSort} setSort={setChefSort}
          onItemUpdate={handleItemUpdate} onOrderServed={handleOrderServed} loadingIds={loadingIds}
        />
      )}
      {role === "staff" && (
        <StaffView orders={orders} onItemUpdate={handleItemUpdate} loadingIds={loadingIds} />
      )}
    </div>
  );
}
