import { MenuItem } from "@/lib/data";
import { useCart } from "@/contexts/CartContext";
import { Star, Plus, Minus, Heart } from "lucide-react";

interface DishCardProps {
  item: MenuItem;
  compact?: boolean;
  source?: string;
}

export default function DishCard({ item, compact = false, source = "Menu" }: DishCardProps) {
  const { addItem, removeItem, getItemQuantity } = useCart();
  const quantity = getItemQuantity(item.id);

  return (
    <div id={`menu-item-${item.id}`} className={`flex items-center gap-4 bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-white relative overflow-visible ${compact ? "p-3" : "p-4"}`}>

      {/* 1. Extreme Left: Image */}
      <div className="relative flex-shrink-0">
        <div className={`${compact ? "w-[80px] h-[80px] md:w-[90px] md:h-[90px]" : "w-[100px] h-[100px] md:w-[120px] md:h-[120px]"} rounded-2xl overflow-hidden shadow-sm bg-gray-100`}>
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Wishlist Heart */}
        <button className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-full shadow-sm backdrop-blur-[2px] z-10">
          <Heart size={12} className="text-gray-400" />
        </button>
      </div>

      {/* 2. Middle: Info Content */}
      <div className="flex-1 min-w-0 flex flex-col py-1">
        <div>
          {/* Veg/Non-veg & Badges Row */}
          <div className="flex items-center gap-1.5 mb-1">
            {/* Zomato Style Veg/Non-Veg Icon */}
            <div className={`w-3.5 h-3.5 border-[1.5px] rounded-[3px] flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-500'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-500'}`} />
            </div>

            {item.isBestseller && (
              <span className="bg-[#FFF4F2] text-[#FF5200] text-[8px] font-extrabold px-1.5 py-0.5 rounded-[4px] tracking-wide uppercase">
                Bestseller
              </span>
            )}
            {item.isChefSpecial && (
              <span className="bg-yellow-50 text-yellow-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded-[4px] tracking-wide uppercase">
                Chef's Special
              </span>
            )}
          </div>

          {/* Dish Name */}
          <h3 className={`font-black text-gray-800 leading-tight mb-0.5 ${compact ? "text-sm" : "text-base"} line-clamp-1`}>
            {item.name}
          </h3>

          {/* Description */}
          {item.description && (
            <p className="text-[10px] text-gray-400 font-medium line-clamp-2 leading-relaxed mb-1">
              {item.description}
            </p>
          )}

          {/* Price Section */}
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-sm font-bold text-gray-900">KSh {item.price}</span>
            {item.originalPrice && (
              <span className="text-[10px] text-gray-400 font-medium line-through">
                KSh {item.originalPrice}
              </span>
            )}
          </div>

          {/* Rating Badge */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 bg-green-700 text-white px-1 py-[1px] rounded-[3px] text-[10px] font-bold shadow-sm">
              {item.rating} <Star className="w-2 h-2 fill-current" strokeWidth={0} />
            </div>
            <span className="text-[10px] text-gray-500 font-semibold">({item.ratingCount})</span>
          </div>
        </div>
      </div>

      {/* 3. Extreme Right: Add Button */}
      <div className="flex-shrink-0 flex flex-col items-center justify-center min-w-[90px] self-center pl-2">
        <div className="w-full shadow-md rounded-lg bg-white overflow-hidden">
          {quantity === 0 ? (
            <button
              onClick={() => addItem(item, false, source)}
              className="w-full bg-[#FFF4F2] hover:bg-[#ffe5e5] text-[#E23744] border border-[#E23744]/20 font-extrabold text-xs h-8 rounded-lg uppercase tracking-wide flex items-center justify-center transition-colors"
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center justify-between bg-[#E23744] text-white h-8 rounded-lg px-2 w-full shadow-inner">
              <button
                onClick={() => removeItem(item.id, false, source)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <Minus size={12} strokeWidth={3} />
              </button>
              <span className="font-black text-xs">{quantity}</span>
              <button
                onClick={() => addItem(item, false, source)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
        {quantity === 0 && (
          <p className="text-[8px] text-gray-400 font-semibold mt-1 uppercase tracking-tighter">
            customisable
          </p>
        )}
      </div>
    </div>
  );
}