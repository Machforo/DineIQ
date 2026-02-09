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
    <div className={`flex gap-4 bg-white rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-white relative overflow-visible ${compact ? "p-3" : "p-4"}`}>

      {/* Left: Info Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {/* Veg/Non-veg & Badges Row */}
          <div className="flex items-center gap-1.5 mb-1.5">
            {/* Zomato Style Veg/Non-Veg Icon */}
            <div className={`w-3.5 h-3.5 border-[1.5px] rounded-[3px] flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-500'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-500'}`} />
            </div>

            {item.isBestseller && (
              <span className="bg-[#FFF4F2] text-[#FF5200] text-[9px] font-extrabold px-1.5 py-0.5 rounded-[4px] tracking-wide uppercase">
                Bestseller
              </span>
            )}
            {item.isChefSpecial && (
              <span className="bg-yellow-50 text-yellow-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded-[4px] tracking-wide uppercase">
                Chef's Special
              </span>
            )}
          </div>

          {/* Dish Name */}
          <h3 className={`font-black text-gray-800 leading-tight mb-1 ${compact ? "text-[15px]" : "text-[17px]"} line-clamp-2`}>
            {item.name}
          </h3>

          {/* Rating Badge */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-0.5 bg-green-700 text-white px-1.5 py-[2px] rounded-[4px] text-[11px] font-bold shadow-sm">
              {item.rating} <Star className="w-2 h-2 fill-current" strokeWidth={0} />
            </div>
            <span className="text-[11px] text-gray-500 font-semibold">({item.ratingCount} votes)</span>
          </div>

          {/* Price Section */}
          <div className="mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-bold text-gray-900">₹{item.price}</span>
              {item.originalPrice && (
                <span className="text-xs text-gray-400 font-medium line-through">
                  ₹{item.originalPrice}
                </span>
              )}
            </div>
            {item.goldPrice && (
              <div className="flex items-center gap-1 mt-0.5">
                <img src="https://cdn-icons-png.flaticon.com/512/3081/3081840.png" className="w-3 h-3 opacity-80" alt="Gold" />
                <span className="text-[10px] font-bold text-yellow-700">₹{item.goldPrice} for Gold Members</span>
              </div>
            )}
          </div>
        </div>

        {/* Description (Bottom) */}
        {!compact && (
          <p className="text-[12px] text-gray-400 font-medium mt-2 line-clamp-2 leading-relaxed tracking-tight">
            {item.description}
          </p>
        )}
      </div>

      {/* Right: Image + Floating Button */}
      <div className="relative flex-shrink-0">
        <div className={`${compact ? "w-[100px] h-[100px] md:w-[110px] md:h-[110px]" : "w-[110px] h-[110px] md:w-[130px] md:h-[130px]"} rounded-2xl overflow-hidden shadow-sm bg-gray-100`}>
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Wishlist Heart */}
        <button className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm backdrop-blur-[2px] z-10">
          <Heart size={14} className="text-gray-400" />
        </button>

        {/* Floating Add Button */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[90px] shadow-lg rounded-lg bg-white z-20">
          {quantity === 0 ? (
            <button
              onClick={() => addItem(item)}
              className="w-full bg-[#FFF4F4] hover:bg-[#ffe5e5] text-[#E23744] border border-[#E23744]/20 font-extrabold text-sm h-9 rounded-lg uppercase tracking-wide flex items-center justify-center transition-colors"
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center justify-between bg-[#E23744] text-white h-9 rounded-lg px-2 w-full shadow-inner">
              <button
                onClick={() => removeItem(item.id)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <Minus size={14} strokeWidth={3} />
              </button>
              <span className="font-black text-sm">{quantity}</span>
              <button
                onClick={() => addItem(item)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>

        {/* Customizable Text */}
        {quantity === 0 && (
          <p className="text-[8px] text-center text-gray-400 font-medium absolute -bottom-7 left-0 right-0">
            customisable
          </p>
        )}
      </div>
    </div>
  );
}