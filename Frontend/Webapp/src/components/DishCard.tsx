import { useCart } from "@/contexts/CartContext";
import { Plus, Minus, Star, Clock, Flame } from "lucide-react";
import { MenuItem } from "@/lib/data";

interface DishCardProps {
  item: MenuItem;
  compact?: boolean;
}

export default function DishCard({ item, compact = false }: DishCardProps) {
  const { addItem, removeItem, getItemQuantity } = useCart();
  const quantity = getItemQuantity(item.id);

  // Veg/NonVeg Indicator (FSSAI style)
  const VegBadge = ({ size = "sm" }: { size?: "sm" | "lg" }) => {
    const sz = size === "sm" ? "w-4 h-4" : "w-5 h-5";
    return (
      <div className={`${sz} border-2 rounded-sm flex items-center justify-center p-[2px] bg-white shadow-sm ${item.isVeg ? 'border-veg-green' : 'border-non-veg-red'}`}>
        <div className={`w-full h-full rounded-full ${item.isVeg ? 'bg-veg-green' : 'bg-non-veg-red'}`} />
      </div>
    );
  };

  if (compact) {
    return (
      <div className="group bg-white rounded-2xl flex gap-3 overflow-hidden border border-gray-100/80 hover:shadow-md hover:border-gray-200 transition-all duration-200 active:scale-[0.99]">
        {/* Image */}
        <div className="relative w-28 h-28 flex-shrink-0 bg-gray-100">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-2 left-2">
            <VegBadge size="sm" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between py-3 pr-3 min-w-0">
          <div>
            <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1 mb-1">
              {item.name}
            </h3>
            {item.description && (
              <p className="text-[11px] text-gray-400 line-clamp-1 leading-snug">
                {item.description}
              </p>
            )}
            {item.rating && (
              <div className="flex items-center gap-1 mt-1.5">
                <div className="flex items-center gap-0.5 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  <Star className="w-2.5 h-2.5 fill-white" strokeWidth={0} />
                  {item.rating}
                </div>
                <span className="text-[10px] text-gray-400">({item.ratingCount})</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="text-base font-black text-gray-900">₹{item.price}</span>
            </div>
            {quantity === 0 ? (
              <button
                onClick={() => addItem(item)}
                className="text-primary border-2 border-primary font-black text-xs px-4 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-all duration-200 uppercase tracking-wider active:scale-95"
              >
                ADD
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-primary rounded-lg overflow-hidden h-8 shadow-md">
                <button
                  onClick={() => removeItem(item.id)}
                  className="w-8 h-full flex items-center justify-center text-white hover:bg-black/10 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-white font-black min-w-[22px] text-center text-sm">{quantity}</span>
                <button
                  onClick={() => addItem(item)}
                  className="w-8 h-full flex items-center justify-center text-white hover:bg-black/10 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full Card
  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 hover:-translate-y-1">
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-gray-100">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />

        {/* Veg/Non-veg badge */}
        <div className="absolute top-3 left-3 z-20">
          <VegBadge size="lg" />
        </div>

        {/* Rating */}
        {item.rating && (
          <div className="absolute top-3 right-3 z-20 bg-primary text-white text-[11px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
            <Star className="w-2.5 h-2.5 fill-white" strokeWidth={0} />
            {item.rating}
          </div>
        )}

        {/* Price badge on image */}
        <div className="absolute bottom-3 left-3 z-20">
          <span className="text-2xl font-black text-white drop-shadow-lg">₹{item.price}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-2 mb-1">
          {item.name}
        </h3>
        {item.description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3">
            {item.description}
          </p>
        )}

        {/* Action */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>20-25 min</span>
          </div>
          {quantity === 0 ? (
            <button
              onClick={() => addItem(item)}
              className="text-primary border-2 border-primary font-black text-xs px-5 py-2 rounded-xl hover:bg-primary hover:text-white transition-all duration-200 uppercase tracking-wider active:scale-95 shadow-sm hover:shadow-md"
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-primary rounded-xl shadow-md overflow-hidden h-9">
              <button
                onClick={() => removeItem(item.id)}
                className="w-9 h-full flex items-center justify-center text-white hover:bg-black/10 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-white font-black min-w-[28px] text-center text-sm">{quantity}</span>
              <button
                onClick={() => addItem(item)}
                className="w-9 h-full flex items-center justify-center text-white hover:bg-black/10 transition-colors"
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