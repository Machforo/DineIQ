import {
  BarChart3,
  UtensilsCrossed,
  Users,
  Heart,
  Brain,
  ShoppingCart,
  Package,
  MessageCircle,
  Megaphone,
  Activity,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Analytics", url: "/", icon: BarChart3 },
  { title: "Menu", url: "/menu", icon: UtensilsCrossed },
  { title: "Customer Auth", url: "/customer-auth", icon: Users },
  { title: "Customer Preferences", url: "/customer-preferences", icon: Heart },
  { title: "Customer Activities", url: "/customer-activities", icon: Activity },
  { title: "Customer Insights", url: "/customer-insights", icon: Brain },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Order Items", url: "/order-items", icon: Package },
  { title: "Chats", url: "/chats", icon: MessageCircle },
  { title: "Campaigns", url: "/campaigns", icon: Megaphone },
];

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <UtensilsCrossed className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-sidebar-foreground">DineIQ</span>
        </div>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
