import { MenuItem } from "@/lib/data";
import { useCart } from "@/contexts/CartContext";
import { Star, Plus, Minus, Sparkles, ChefHat } from "lucide-react";

interface ComboCardProps {
  item: MenuItem;
}

export default function ComboCard({ item }: ComboCardProps) {
  const { addItem, removeItem, getItemQuantity } = useCart();
  const quantity = getItemQuantity(item.id);
  const savings = item.originalPrice ? item.originalPrice - item.price : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-lg relative overflow-hidden flex-shrink-0 w-72 md:w-80 snap-center group">

      {/* Image Section */}
      <div className="relative h-44 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />

        {/* Savings Badge */}
        {savings > 0 && (
          <div className="absolute top-3 left-3 bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg z-20">
            SAVE ₹{savings}
          </div>
        )}

        {/* AI/Chef Badge */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-800 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 z-20">
          <Sparkles className="w-3 h-3 text-purple-500" />
          <span>Specials</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-1">{item.name}</h3>
          <div className={`flex-shrink-0 w-3.5 h-3.5 border-[2px] mt-1 ${item.isVeg ? "border-green-600" : "border-red-500"} flex items-center justify-center p-[1px] rounded-sm`}>
            <div className={`w-full h-full rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-500"}`} />
          </div>
        </div>

        <p className="text-xs text-gray-500 font-medium mb-4 line-clamp-2 h-8">
          {item.comboItems ? item.comboItems.join(" • ") : item.description}
        </p>

        {/* Price & Action */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 line-through">₹{item.originalPrice || Math.round(item.price * 1.2)}</span>
            <span className="text-xl font-black text-gray-900">₹{item.price}</span>
          </div>

          {quantity === 0 ? (
            <button
              onClick={() => addItem(item)}
              className="bg-red-50 border border-red-100 text-[#E23744] font-bold px-6 py-2 rounded-xl shadow-sm hover:bg-[#E23744] hover:text-white transition-all text-sm uppercase tracking-wide"
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center bg-[#E23744] rounded-xl shadow-lg overflow-hidden h-9">
              <button
                onClick={() => removeItem(item.id)}
                className="w-8 h-full flex items-center justify-center text-white hover:bg-black/10 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-white font-bold min-w-[24px] text-center text-sm">
                {quantity}
              </span>
              <button
                onClick={() => addItem(item)}
                className="w-8 h-full flex items-center justify-center text-white hover:bg-black/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
