import { useCart } from "@/contexts/CartContext";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function CartBar() {
  const { totalItems, totalPrice } = useCart();
  const location = useLocation();

  if (totalItems === 0 || location.pathname === "/cart" || location.pathname === "/payment") {
    return null;
  }

  return (
    <div className="fixed bottom-[72px] left-4 right-4 z-40 animate-in slide-in-from-bottom-4 duration-300">
      <Link to="/cart">
        <div className="bg-[#E23744] text-white rounded-2xl shadow-[0_8px_32px_rgba(226,55,68,0.45)] p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all hover:bg-[#cc2f3d]">

          {/* Left: Items Info */}
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl w-10 h-10 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 fill-white text-white" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-[#E23744] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase opacity-80 tracking-widest leading-none mb-0.5">
                {totalItems} Item{totalItems !== 1 && "s"} Added
              </span>
              <span className="font-black text-xl leading-none flex items-baseline gap-1">
                ₹{totalPrice}
                <span className="text-[10px] font-medium opacity-70 ml-1">+ taxes</span>
              </span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2.5 rounded-xl">
            <span className="font-black text-sm tracking-wide">View Cart</span>
            <ArrowRight className="w-4 h-4" />
          </div>

        </div>
      </Link>
    </div>
  );
}