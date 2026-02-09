import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { ShoppingBag, ChevronRight } from "lucide-react";

export default function CartBar() {
  const navigate = useNavigate();
  const { totalItems, totalPrice } = useCart();

  if (totalItems === 0) return null;

  return (
    // Floating Bar Container
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up safe-bottom">
      
      {/* Zomato Red Card */}
      <div 
        onClick={() => navigate("/cart")}
        className="bg-[#E23744] text-white rounded-xl shadow-[0_8px_30px_rgba(226,55,68,0.4)] p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
      >
        
        {/* Left: Items Info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-0.5">
             <span className="font-bold text-xs uppercase opacity-80 border border-white/30 px-1.5 rounded-[4px]">
               {totalItems} {totalItems === 1 ? "ITEM" : "ITEMS"}
             </span>
          </div>
          <div className="flex items-baseline gap-1">
             <span className="font-black text-lg">₹{totalPrice}</span>
             <span className="text-[10px] font-medium opacity-70">plus taxes</span>
          </div>
        </div>

        {/* Right: View Cart Button */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">View Cart</span>
          <div className="bg-black/20 rounded-md p-1">
             <ChevronRight className="w-5 h-5" strokeWidth={3} />
          </div>
        </div>
        
      </div>
    </div>
  );
}