import { useCart } from "@/contexts/CartContext";
import { Plus, Minus, Star } from "lucide-react";
import { MenuItem } from "@/lib/data";

interface DishCardProps {
  item: MenuItem;
  compact?: boolean;
}

export default function DishCard({ item, compact = false }: DishCardProps) {
  const { addItem, removeItem, getItemQuantity } = useCart();
  const quantity = getItemQuantity(item.id);

  if (compact) {
    return (
      <div className="group bg-white rounded-2xl p-4 flex gap-4 border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300 hover:-translate-y-1">
        {/* Image */}
        <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {/* Veg Badge */}
          <div className="absolute top-2 left-2 z-20">
            <div className={`w-4 h-4 border-[2.5px] rounded-sm flex items-center justify-center p-[1.5px] ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
              {item.isVeg ? (
                <div className="w-full h-full rounded-full bg-green-600" />
              ) : (
                <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-red-600" />
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-1 mb-1">
              {item.name}
            </h3>
            <p className="text-xs text-gray-500 line-clamp-1 mb-2">
              {item.description}
            </p>
            {item.rating && (
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-semibold text-gray-700">{item.rating}</span>
                <span className="text-xs text-gray-400">({item.ratingCount})</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-lg font-black text-gray-900">₹{item.price}</span>
            {quantity === 0 ? (
              <button
                onClick={() => addItem(item)}
                className="bg-red-50 border-2 border-red-100 text-red-600 font-bold px-5 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition-all text-xs uppercase tracking-wide"
              >
                ADD
              </button>
            ) : (
              <div className="flex items-center bg-red-600 rounded-lg overflow-hidden h-8 shadow-md">
                <button
                  onClick={() => removeItem(item.id)}
                  className="w-8 h-full flex items-center justify-center text-white hover:bg-black/10"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-white font-bold min-w-[24px] text-center text-sm">
                  {quantity}
                </span>
                <button
                  onClick={() => addItem(item)}
                  className="w-8 h-full flex items-center justify-center text-white hover:bg-black/10"
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

  // Full Card (for Chef's Special, etc.)
  return (
    <div className="group relative bg-white rounded-3xl overflow-hidden border border-gray-100 hover:shadow-2xl hover:border-gray-200 transition-all duration-500 hover:-translate-y-2">
      {/* Premium Image */}
      <div className="relative h-48 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent z-10" />
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />

        {/* Veg Badge */}
        <div className="absolute top-4 left-4 z-20">
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
          <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-bold text-gray-900">{item.rating}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-bold text-gray-900 text-xl leading-tight line-clamp-2 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          {item.name}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
          {item.description}
        </p>

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-2xl font-black text-gray-900">₹{item.price}</span>
          {quantity === 0 ? (
            <button
              onClick={() => addItem(item)}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm uppercase tracking-wider transform hover:scale-105 active:scale-95"
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg overflow-hidden h-11">
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