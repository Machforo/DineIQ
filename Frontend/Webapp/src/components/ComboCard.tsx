import { useCart } from "@/contexts/CartContext";
import { Plus, Minus, Star, Sparkles } from "lucide-react";
import { MenuItem } from "@/lib/data";

interface ComboCardProps {
  item: MenuItem;
}

export default function ComboCard({ item }: ComboCardProps) {
  const { addItem, removeItem, getItemQuantity } = useCart();
  const quantity = getItemQuantity(item.id);

  // Calculate savings if original price exists
  const savings = item.originalPrice ? item.originalPrice - item.price : 0;
  const discountPercent = item.originalPrice ? Math.round((savings / item.originalPrice) * 100) : 0;

  return (
    <div className="group relative bg-white rounded-3xl overflow-hidden flex-shrink-0 w-96 md:w-[420px] snap-center border border-gray-100 hover:shadow-2xl hover:border-gray-200 transition-all duration-500 hover:-translate-y-2">
      {/* Premium Image Section */}
      <div className="relative h-52 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />

        {/* Premium Badges */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-20">
          {/* Savings Badge */}
          {savings > 0 && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-xl flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>SAVE â‚¹{savings}</span>
            </div>
          )}

          {/* Combo Badge */}
          <div className="bg-gradient-to-r from-accent to-[#8B4513] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xl flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>Harvest Special</span>
          </div>
        </div>

        {/* Veg Badge */}
        <div className="absolute bottom-4 left-4 z-20">
          <div className={`w-5 h-5 border-[2.5px] rounded-sm flex items-center justify-center p-[2px] bg-white/95 backdrop-blur-sm shadow-lg ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
            {item.isVeg ? (
              <div className="w-full h-full rounded-full bg-green-600" />
            ) : (
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-red-600" />
            )}
          </div>
        </div>

        {/* Rating Badge */}
        {item.rating && (
          <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-maroon" />
            <span className="text-xs font-bold text-gray-900">{item.rating}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-xl leading-tight line-clamp-2 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          {item.name}
        </h3>

        <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
          {item.description}
        </p>

        {/* Combo Items */}
        {(() => {
          let itemsToShow = [];
          if (item.comboItems && item.comboItems.length > 0) {
            itemsToShow = item.comboItems;
          } else if (item.description) {
            // Regex to split by dot, plus, or comma with optional spaces
            const parts = item.description.split(/[•\+\,]/).map(s => s.trim()).filter(s => s.length > 0);
            if (parts.length > 1) {
              itemsToShow = parts;
            }
          }

          if (itemsToShow.length > 0) {
            return (
              <div className="mb-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-700 font-medium">
                  {itemsToShow.map((ci: any) => typeof ci === 'string' ? ci : (ci.name || ci.item_name || 'Item')).join(" • ")}
                </p>
              </div>
            );
          }
          return null;
        })()}

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex flex-col">
            {item.originalPrice && (
              <span className="text-sm text-gray-400 line-through font-medium">â‚¹{item.originalPrice}</span>
            )}
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-gray-900">â‚¹{item.price}</span>
              {discountPercent > 0 && (
                <span className="text-xs font-bold text-green-600">
                  {discountPercent}% OFF
                </span>
              )}
            </div>
          </div>

          {quantity === 0 ? (
            <button
              onClick={() => addItem(item)}
              className="bg-primary hover:bg-[#243d33] text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm uppercase tracking-wider transform hover:scale-105 active:scale-95"
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center bg-primary rounded-xl shadow-lg overflow-hidden h-11">
              <button
                onClick={() => removeItem(item.id)}
                className="w-10 h-full flex items-center justify-center text-white hover:bg-black/10"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-white font-bold min-w-[32px] text-center text-base">
                {quantity}
              </span>
              <button
                onClick={() => addItem(item)}
                className="w-10 h-full flex items-center justify-center text-white hover:bg-black/10"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
    </div>
  );
}

