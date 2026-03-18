import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useUser } from "@/contexts/UserContext";
import { 
  ShoppingBag, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Plus, 
  Minus,
  ArrowRight
} from "lucide-react";

/* ---------------------------------------------------------
   DESIGN TOKENS (Matching Sana V2)
--------------------------------------------------------- */
const Z = {
  red:       "#E23744",
  redDark:   "#C0303C",
  redLight:  "#FFF1F2",
  dark:      "#1C1C1C",
  charcoal:  "#3D3D3D",
  mid:       "#696969",
  muted:     "#9E9E9E",
  line:      "#EFEFEF",
  lineLight: "#F7F7F7",
  surface:   "#F8F8F8",
  white:     "#FFFFFF",
  green:     "#1BA672",
};

export default function CartBar() {
  const navigate = useNavigate();
  const { tableNumber } = useUser();
  const { 
    items, 
    totalItems, 
    totalPrice, 
    updateQuantity, 
    removeItem, 
    clearCart 
  } = useCart();
  
  const [expanded, setExpanded] = useState(false);
  const [badgeKey, setBadgeKey] = useState(0);
  const prevQty = useRef(0);

  // Trigger badge pop animation on qty change
  useEffect(() => {
    if (totalItems !== prevQty.current) {
      setBadgeKey(k => k + 1);
      prevQty.current = totalItems;
    }
  }, [totalItems]);

  if (totalItems === 0) return null;

  const tableNo = tableNumber || localStorage.getItem("dineiq_table_number") || "1";

  return (
    <div className="cart-bar-root fixed bottom-0 left-0 right-0 z-[60] px-3 pb-4 pointer-events-none">
      <style>{`
        @keyframes cartSlideUp {
          from { transform: translateY(110%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes badgePop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.6); }
          70%  { transform: scale(0.88); }
          100% { transform: scale(1); }
        }
        @keyframes cartItemIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .cart-bar-pill {
          pointer-events: all;
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 
            0 -1px 0 rgba(0,0,0,0.04),
            0 8px 40px rgba(226,55,68,0.30),
            0 24px 64px rgba(0,0,0,0.18);
          animation: cartSlideUp 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
          max-width: 540px;
          margin: 0 auto;
          font-family: 'DM Sans', sans-serif;
        }
        .cart-collapsed {
          background: linear-gradient(135deg, ${Z.red} 0%, ${Z.redDark} 100%);
        }
        .cart-badge-pop {
          animation: badgePop 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }
        .hide-sb::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="cart-bar-pill">
        {/* -- Expanded Sheet -- */}
        {expanded && (
          <div className="cart-sheet bg-white">
            {/* Sheet Header */}
            <div className="flex items-center justify-between p-4 pb-2 border-bottom border-[#F7F7F7]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#E23744]" />
                <span className="text-sm font-extrabold text-[#1C1C1C]">Your Order</span>
                <span className="text-[11px] font-bold text-[#E23744] bg-[#FFF1F2] px-2 py-0.5 rounded-full">
                  Table {tableNo}
                </span>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="w-7 h-7 rounded-lg bg-[#F7F7F7] flex items-center justify-center text-[#696969]"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Item List */}
            <div className="max-h-[264px] overflow-y-auto hide-sb">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 p-3 px-4 border-b border-[#F7F7F7] animate-[cartItemIn_0.2s_ease_both]"
                  style={{ animationDelay: `${idx * 0.04}s` }}
                >
                  {/* Veg Indicator */}
                  <div className={`w-3.5 h-3.5 rounded-sm border-[1.5px] flex items-center justify-center shrink-0 ${item.isVeg ? 'border-[#1BA672]' : 'border-[#C8102E]'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-[#1BA672]' : 'bg-[#C8102E]'}`} />
                  </div>

                  {/* Thumbnail */}
                  <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Name + Price Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#1C1C1C] truncate">{item.name}</p>
                    <p className="text-xs text-[#9E9E9E] mt-0.5">
                      KSh {item.price} × {item.quantity}{" "}
                      <strong className="text-[#1C1C1C]">
                        = KSh {(item.price * item.quantity).toLocaleString()}
                      </strong>
                    </p>
                  </div>

                  {/* Qty Stepper */}
                  <div className="flex items-center gap-1.5 bg-[#E23744] rounded-lg p-1.5 shadow-sm">
                    <button
                      className="w-5 h-5 rounded-[4px] bg-white/20 flex items-center justify-center text-white"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </button>
                    <span className="text-[13px] font-black text-white min-w-[14px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      className="w-5 h-5 rounded-[4px] bg-white/20 flex items-center justify-center text-white"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-[#9E9E9E] hover:text-[#E23744] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Totals Row */}
            <div className="flex items-center justify-between p-4 py-2.5 bg-[#F8F8F8] border-t border-[#F7F7F7]">
              <div>
                <p className="text-[11px] text-[#9E9E9E] font-semibold">
                  {totalItems} item{totalItems > 1 ? "s" : ""} · To pay
                </p>
                <p className="text-lg font-black text-[#1C1C1C]">
                  KSh {totalPrice.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => { clearCart(); setExpanded(false); }}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[#EFEFEF] bg-white text-xs font-bold text-[#696969] active:bg-gray-50"
              >
                <Trash2 className="w-3 h-3" /> Clear all
              </button>
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => {
                setExpanded(false);
                navigate("/cart");
              }}
              className="w-full p-4 flex items-center justify-center gap-2 bg-gradient-to-r from-[#E23744] to-[#C0303C] text-white text-sm font-black active:opacity-90 transition-opacity"
            >
              <ShoppingBag className="w-4.5 h-4.5" />
              Place Order · KSh {totalPrice.toLocaleString()}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* -- Collapsed Pill -- */}
        {!expanded && (
          <div 
            className="cart-collapsed flex items-center justify-between p-3.5 px-4.5 cursor-pointer"
            onClick={() => setExpanded(true)}
          >
            {/* Left: Icon + Text */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-[44px] h-[44px] rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div
                  key={badgeKey}
                  className={`cart-badge-pop absolute -top-2 -right-2 min-w-[20px] h-5 rounded-full bg-white text-[#E23744] text-[11px] font-black flex items-center justify-center px-1.5 shadow-sm`}
                >
                  {totalItems}
                </div>
              </div>
              <div>
                <p className="text-[11px] text-white/70 font-bold leading-none">
                  {totalItems} item{totalItems > 1 ? "s" : ""} · Table {tableNo}
                </p>
                <p className="text-[17px] font-black text-white leading-tight mt-1">
                  KSh {totalPrice.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Right: CTA Pill */}
            <div className="flex items-center gap-1.5 bg-white/20 rounded-xl px-3.5 py-2 border border-white/30 active:bg-white/30 transition-colors">
              <span className="text-[13px] font-extrabold text-white">View Cart</span>
              <ChevronUp className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}