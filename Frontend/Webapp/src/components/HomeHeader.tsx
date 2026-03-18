import { useUser } from "@/contexts/UserContext";
import { Search, Mic, MicOff, MapPin, ShoppingBag, Star, User, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import SidebarMenu from "./SidebarMenu";
import { useState, useRef, useCallback } from "react";

interface HomeHeaderProps {
  onSearch?: (query: string) => void;
  searchQuery?: string;
}

const useVoiceSearch = (onResult: (text: string) => void) => {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const toggle = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search not supported in this browser.");
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SpeechRecognition();
    recRef.current = rec;
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const txt = e.results[0][0].transcript;
      onResult(txt);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  }, [listening, onResult]);

  return { listening, toggle };
};

export default function HomeHeader({ onSearch, searchQuery = "" }: HomeHeaderProps) {
  // 'tableNumber' को context से निकाला
  const { guestName, isVegMode, toggleVegMode, tableNumber } = useUser();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const handleVoiceResult = (text: string) => {
    console.log("🎤 Voice Result:", text);
    onSearch?.(text);
  };

  const { listening, toggle } = useVoiceSearch(handleVoiceResult);

  return (
    <header className="bg-white sticky top-0 z-40 pb-3 transition-all shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)]">

      {/* Top row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">

          <div className="flex items-center gap-2.5">
            {/* User Avatar Initials / Sidebar Menu */}
            <SidebarMenu>
              <button
                className="w-[38px] h-[38px] rounded-xl bg-gradient-to-br from-[#E23744] to-[#C0303C] border-2 border-[#FDDCDE] shadow-[0_2px_8px_rgba(226,55,68,0.3)] flex items-center justify-center text-white text-sm font-black shrink-0 transition-transform active:scale-95"
              >
                {(!guestName || guestName.toLowerCase() === "guest")
                  ? <User className="w-[18px] h-[18px] text-white" />
                  : guestName.slice(0, 2).toUpperCase()}
              </button>
            </SidebarMenu>

            <div className="flex flex-col">
              <h1 className="text-base font-extrabold text-gray-900 tracking-tight leading-none mb-1">
                Hi, {guestName || "Guest"} 👋
              </h1>

              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 tracking-wide">
                <MapPin size={10} className="text-[#E23744]" fill="currentColor" />
                {tableNumber ? (
                  <>
                    <span className="text-[#E23744] font-bold">Table {tableNumber}</span>
                    <span>· Harvest & Ember</span>
                  </>
                ) : (
                  <>
                    <span className="text-[#E23744] font-bold">Dine In</span>
                    <span>· Harvest & Ember</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Actions - Review, Cart, Veg Mode & Notifications */}
        <div className="flex items-center gap-2">
          {/* Review Button */}
          <button
            onClick={() => navigate("/review")}
            className="px-3 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
            title="You Opinion about us"
          >
            <Star className="w-4 h-4 text-orange-500" fill="currentColor" />
            <span className="text-[10px] font-black text-orange-700 uppercase tracking-tight whitespace-nowrap">Rate Us/Complain</span>
          </button>

          {/* Cart Icon */}
          <button
            onClick={() => navigate("/cart")}
            className="relative w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center transition-all active:scale-95"
            title="View Your Cart"
          >
            <ShoppingBag className="w-5 h-5 text-gray-700" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#E23744] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                {totalItems}
              </span>
            )}
          </button>

          {/* Veg Mode Toggle (Filter) */}
          <div className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full flex flex-col items-center justify-center">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">VEG</span>
            <Switch
              checked={isVegMode}
              onCheckedChange={toggleVegMode}
              className="h-4 w-7 data-[state=checked]:bg-green-600 border-none shadow-sm"
            />
          </div>

          {/* Notification Bell */}
          <button
            className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center transition-all active:scale-95 shadow-sm"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Search row */}
      <div className="px-4">
        <div className="relative flex items-center bg-gray-50 border-[1.5px] border-gray-100 rounded-xl transition-all focus-within:border-[#E23744] focus-within:ring-4 focus-within:ring-[#E23744]/10 h-[42px]">
          <Search className="absolute left-3 w-[15px] h-[15px] text-gray-400" strokeWidth={2.5} />
          <input
            type="text"
            value={searchQuery}
            placeholder="Search for dishes, cuisines…"
            onChange={(e) => {
              console.log("⌨️ Input Change:", e.target.value);
              onSearch?.(e.target.value);
            }}
            className="w-full h-full pl-[36px] pr-12 bg-transparent border-none text-[13px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
          />
          <button
            onClick={toggle}
            className={`absolute right-1 w-9 h-9 rounded-lg flex items-center justify-center transition-all border-none cursor-pointer ${listening ? 'bg-[#E23744] animate-pulse' : 'bg-transparent hover:bg-gray-200'}`}
          >
            {listening
              ? <MicOff className="w-4 h-4 text-white" />
              : <Mic className="w-4 h-4 text-gray-600" />
            }
          </button>
        </div>
      </div>
    </header>
  );
}