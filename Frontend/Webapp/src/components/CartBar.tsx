import { useCart } from "@/contexts/CartContext";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function CartBar() {
  const { totalItems, totalPrice } = useCart();
  const location = useLocation();

  if (totalItems === 0 || location.pathname === "/cart" || location.pathname === "/payment") {
    return null;
  }

  return (
    <div className="fixed bottom-[80px] left-4 right-4 z-40 animate-in slide-in-from-bottom-5 duration-300">
      <Link to="/cart">
        <div className="bg-[#E23744] text-white rounded-xl shadow-[0_8px_20px_-4px_rgba(226,55,68,0.5)] p-3.5 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform border border-white/10 backdrop-blur-md">

          {/* Left: Items Info */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase opacity-90 tracking-widest mb-0.5">
              {totalItems} ITEM{totalItems !== 1 && "S"} ADDED
            </span>
            <span className="font-black text-lg flex items-center gap-1 leading-none">
              ₹{totalPrice} <span className="text-[10px] font-medium opacity-70 ml-1">plus taxes</span>
            </span>
          </div>

          {/* Right: View Cart Button */}
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            <span className="font-bold text-sm">View Cart</span>
            <ShoppingBag className="w-4 h-4 fill-white" />
          </div>

        </div>
      </Link>
    </div>
  );
}