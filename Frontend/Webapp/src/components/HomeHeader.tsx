import { Search, MapPin, Bell, User } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import SidebarMenu from "./SidebarMenu";
import { forwardRef, useImperativeHandle, useRef } from "react";

interface HomeHeaderProps {
  onSearch: (query: string) => void;
  searchQuery: string;
}

export interface HomeHeaderHandle {
  focusSearch: () => void;
}

const HomeHeader = forwardRef<HomeHeaderHandle, HomeHeaderProps>(({ onSearch, searchQuery }, ref) => {
  const { guestName, tableNumber } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      inputRef.current?.focus();
    }
  }));

  const handleSearchClick = () => {
    inputRef.current?.focus();
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 transition-all duration-300">
      <div className="px-4 py-3 flex flex-col gap-3">
        {/* Top Row: Location/Table & Profile */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg shadow-sm">
              <MapPin className="w-4 h-4 text-white" fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                TABLE {tableNumber || "01"}
              </h1>
              <span className="text-sm font-black text-gray-800 flex items-center gap-1 font-serif">
                Harvest by DineIQ <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors group">
              <Bell className="w-5 h-5 text-gray-700 group-hover:text-primary transition-colors" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border border-white"></span>
            </button>
            <SidebarMenu>
              <button className="w-9 h-9 rounded-full bg-gray-100 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center hover:bg-gray-200 transition-colors">
                {guestName ? (
                  <span className="text-sm font-bold text-gray-700">
                    {guestName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </SidebarMenu>
          </div>
        </div>

        {/* Search Bar */}
        <div
          onClick={handleSearchClick}
          className="relative group cursor-text"
        >
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-200 transition-colors cursor-pointer z-10">
            <Search className="w-4 h-4 text-primary group-focus-within:scale-110 transition-transform duration-200" />
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for 'Biryani', 'Pizza', 'Dessert'..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-gray-800 placeholder:text-gray-400 outline-none transition-all shadow-sm focus:shadow-md"
          />
        </div>
      </div>
    </header>
  );
});

export default HomeHeader;