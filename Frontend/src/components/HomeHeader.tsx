import { useUser } from "@/contexts/UserContext";
import { Search, Mic, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import SidebarMenu from "./SidebarMenu";

interface HomeHeaderProps {
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

export default function HomeHeader({ onSearch, searchQuery = "" }: HomeHeaderProps) {
  // 'tableNumber' को context से निकाला
  const { guestName, isVegMode, toggleVegMode, tableNumber } = useUser();

  return (
    <header className="bg-white sticky top-0 z-40 pb-3 transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)]">

      {/* Top row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">

          {/* Hamburger Menu */}
          <SidebarMenu />

          <div className="flex flex-col">
            {/* --- LOCATION BADGE (Table vs Dine In) --- */}
            <div className="flex items-center gap-1 text-[10px] font-extrabold text-[#E23744] uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-full w-fit mb-0.5">
              <MapPin size={10} className="text-[#E23744]" fill="currentColor" />

              {/* Logic: Table Number hai to wo dikhao, nahi to 'DINE IN' */}
              {tableNumber ? `TABLE #${tableNumber}` : "DINE IN"}
            </div>

            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">
              Hi, {guestName?.split(" ")[0] || "Guest"} 👋
            </h1>
          </div>
        </div>

        {/* Right Side Actions - Veg Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full flex flex-col items-center justify-center">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">VEG</span>
            <Switch
              checked={isVegMode}
              onCheckedChange={toggleVegMode}
              className="h-4 w-7 data-[state=checked]:bg-green-600 border-none shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Search row */}
      <div className="px-4">
        <div className="relative shadow-sm group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E23744]" strokeWidth={2.5} />
          <input
            type="text"
            value={searchQuery}
            placeholder="Search 'Rice', 'Pizza'..."
            onChange={(e) => {
              console.log("⌨️ Input Change:", e.target.value);
              onSearch?.(e.target.value);
            }}
            className="w-full h-[50px] pl-12 pr-12 rounded-xl bg-white border border-gray-200 text-gray-800 placeholder:text-gray-400 font-bold focus:outline-none focus:border-[#E23744] focus:ring-1 focus:ring-[#E23744] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <Mic className="w-5 h-5 text-[#E23744]" />
          </button>
        </div>
      </div>
    </header>
  );
}