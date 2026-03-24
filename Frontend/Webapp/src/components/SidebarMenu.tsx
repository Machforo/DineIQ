import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  User,
  Package,
  Heart,
  History,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  UtensilsCrossed,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

interface SidebarMenuProps {
  children?: React.ReactNode;
}

// Sana Style Design Tokens (Injected as Tailwind or Inline)
const Z = {
  red: "#E23744",
  redDark: "#C0303C",
  line: "#EFEFEF",
  lineLight: "#F7F7F7",
  surface: "#F8F8F8",
  dark: "#1C1C1C",
  mid: "#696969",
  muted: "#9E9E9E",
  charcoal: "#3D3D3D",
};

export default function SidebarMenu({ children }: SidebarMenuProps) {
  const navigate = useNavigate();
  const { profile, tableNumber, logout } = useUser();
  const [open, setOpen] = useState(false);

  const isGuest = !profile?.email || profile?.email === "guest@dineiq.com" || profile?.name === "Guest";
  const name = profile?.name || "Guest";
  const initials = name.slice(0, 2).toUpperCase();

  const menuItems = [
    {
      icon: User,
      label: "My Profile",
      sub: "Personal records & details",
      path: "/profile"
    },
    {
      icon: History,
      label: "Order History",
      sub: "Past visits",
      path: "/orders"
    },
    {
      icon: Package,
      label: "My Orders",
      sub: "Track & reorder",
      path: "/track-order"
    },
    {
      icon: Heart,
      label: "Favourites",
      sub: "Saved dishes",
      path: "/home"
    },
    {
      icon: Settings,
      label: "Preferences",
      sub: "Dietary & taste",
      path: "/preferences"
    },
  ];

  const handleNavigation = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children || (
          <button className="w-10 h-10 rounded-full bg-[#E23744] flex items-center justify-center shadow-sm active:scale-95 transition-all">
            <span className="text-white font-black text-lg leading-none">
              {initials.charAt(0)}
            </span>
          </button>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-[310px] p-0 bg-white border-none flex flex-col h-full overflow-hidden [&>button]:hidden">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
        </SheetHeader>

        {/* Sana Header Styling - Reduced top padding to move content up */}
        <div className="relative pt-8 pb-8 px-6 select-none" style={{
          background: `linear-gradient(135deg, ${Z.red} 0%, ${Z.redDark} 100%)`
        }}>
          {/* Close button (Left Arrow as requested) */}
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 text-white transition-opacity active:opacity-60"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Avatar Area - Left Aligned */}
          <div className="w-[64px] h-[64px] rounded-2xl bg-white/20 border-2 border-white/40 shadow-lg flex items-center justify-center text-[22px] font-black text-white mb-4">
            {isGuest ? <User size={28} /> : initials}
          </div>

          <h2 className="text-[20px] font-black text-white tracking-tight leading-none mb-2">
            {name}
          </h2>

          <div className="flex flex-col gap-1.5 align-start">
            {profile?.phone && (
              <div className="flex items-center gap-1.5 text-white/70 text-[12px] font-medium">
                <Phone size={11} className="text-white/50" />
                {profile.phone}
              </div>
            )}
            {profile?.email && !isGuest && (
              <div className="flex items-center gap-1.5 text-white/70 text-[12px] font-medium">
                <Mail size={11} className="text-white/50" />
                {profile.email}
              </div>
            )}
          </div>

          {tableNumber && (
            <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 border border-white/20">
              <UtensilsCrossed size={12} className="text-white/60" />
              <span className="text-white text-[12px] font-bold">Table {tableNumber}</span>
            </div>
          )}
        </div>

        {/* Sana Menu Items List */}
        <div className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.path)}
              className="w-full flex items-center gap-4 px-6 py-4 transition-colors active:bg-gray-50 border-b border-gray-50"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F8F8F8] border border-[#EFEFEF] flex items-center justify-center shrink-0">
                <item.icon size={18} className="text-[#3D3D3D]" />
              </div>

              <div className="flex-1 text-left min-w-0">
                <p className="text-[14px] font-bold text-[#1C1C1C] leading-none mb-1">
                  {item.label}
                </p>
                <p className="text-[11px] font-medium text-[#9E9E9E] truncate">
                  {item.sub}
                </p>
              </div>

              <ChevronRight size={16} className="text-[#EFEFEF]" />
            </button>
          ))}
        </div>

        {/* Sana Footer (Logout) */}
        <div className="p-6 pt-2">
          {isGuest ? (
            <button
              onClick={() => handleNavigation("/login")}
              className="w-full h-12 rounded-2xl bg-[#E23744] text-white text-[15px] font-black shadow-[0_8px_20px_rgba(226,55,68,0.3)] transition-transform active:scale-95"
            >
              Sign in / Create Account
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full h-12 rounded-2xl bg-[#F8F8F8] border border-[#EFEFEF] text-[#696969] text-[15px] font-bold flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

