import { MenuItem } from "@/lib/data";
import { useCart } from "@/contexts/CartContext";
import { Star, Plus, Minus, Heart } from "lucide-react";

interface DishCardProps {
  item: MenuItem;
  compact?: boolean;
}

export default function DishCard({ item, compact = false }: DishCardProps) {
  const { addItem, removeItem, getItemQuantity } = useCart();
  const quantity = getItemQuantity(item.id);

  return (
    <div className={`flex gap-3 bg-white rounded-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.08)] border border-gray-50 relative overflow-visible ${compact ? "p-3" : "p-3.5"} active:scale-[0.98] transition-transform duration-200`}>

      {/* Left: Info Content - DENSE LAYOUT */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header: Veg/Non-Veg + Bestseller */}
        <div className="flex items-center gap-1.5 mb-1">
          {/* Zomato Style Icon: Square with dot */}
          <div className={`w-3.5 h-3.5 border-[1.5px] rounded-[3px] flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
          </div>

          {item.isBestseller && (
            <span className="bg-[#FFF4F4] text-[#E23744] text-[9px] font-extrabold px-1.5 py-0.5 rounded-[4px] tracking-wide uppercase">
              Bestseller
            </span>
          )}
        </div>

        {/* Dish Name */}
        <h3 className={`font-bold text-gray-800 leading-[1.2] mb-1 ${compact ? "text-[14px]" : "text-[16px]"} line-clamp-2`}>
          {item.name}
        </h3>

        {/* Rating Badge */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex items-center gap-px bg-green-700 text-white px-1.5 py-[1px] rounded-[4px] text-[10px] font-bold shadow-sm">
            {item.rating || 4.2} <Star className="w-2 h-2 fill-current" strokeWidth={0} />
          </div>
          <span className="text-[10px] text-gray-500 font-semibold">({item.ratingCount || "1K+"} ratings)</span>
        </div>

        {/* Price Section */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[14px] font-bold text-gray-900">₹{item.price}</span>
            {item.originalPrice && (
              <span className="text-[10px] text-gray-400 font-medium line-through decoration-gray-400">
                ₹{item.originalPrice}
              </span>
            )}
          </div>
          {!compact && (
            <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {/* Right: Image + Floating Button */}
      <div className="relative flex-shrink-0">
        <div className={`${compact ? "w-[96px] h-[96px]" : "w-[108px] h-[108px]"} rounded-[12px] overflow-hidden bg-gray-100 shadow-inner`}>
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Wishlist Heart */}
        <button className="absolute top-1.5 right-1.5 bg-white/90 p-1 rounded-full shadow-sm backdrop-blur-[2px] z-10 active:scale-95 transition-transform">
          <Heart size={12} className="text-gray-500 hover:text-red-500 hover:fill-red-500 transition-colors" />
        </button>

        {/* Floating Add Button - Zomato Style */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[84px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] rounded-lg bg-white z-20">
          {quantity === 0 ? (
            <button
              onClick={() => addItem(item)}
              className="w-full bg-[#FFF4F4] text-[#E23744] border border-[#E23744]/20 font-black text-sm h-8 rounded-lg uppercase tracking-wide flex items-center justify-center transition-all active:bg-[#ffe5e5]"
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center justify-between bg-[#E23744] text-white h-8 rounded-lg px-2 w-full shadow-md">
              <button
                onClick={() => removeItem(item.id)}
                className="p-0.5 hover:bg-white/20 rounded transition-colors active:scale-90"
              >
                <Minus size={14} strokeWidth={3} />
              </button>
              <span className="font-black text-sm">{quantity}</span>
              <button
                onClick={() => addItem(item)}
                className="p-0.5 hover:bg-white/20 rounded transition-colors active:scale-90"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}