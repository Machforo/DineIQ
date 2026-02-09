import { MenuItem } from "@/lib/data";
import { useCart } from "@/contexts/CartContext";
import { Star, Plus, Minus, Sparkles } from "lucide-react";

interface ComboCardProps {
  item: MenuItem;
}

export default function ComboCard({ item }: ComboCardProps) {
  const { addItem, removeItem, getItemQuantity } = useCart();
  const quantity = getItemQuantity(item.id);
  const savings = item.originalPrice ? item.originalPrice - item.price : 0;

  return (
    <div className="card-dish flex-shrink-0 w-[85vw] max-w-[300px] md:w-72 snap-center overflow-hidden">
      {/* Image */}
      <div className="relative h-36 -mx-4 -mt-4 mb-3">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        {/* Savings badge */}
        {savings > 0 && (
          <div className="absolute top-3 left-3 gradient-primary text-white text-xs font-bold px-2 py-1 rounded-lg shadow-md">
            Save ₹{savings}
          </div>
        )}
        {/* AI badge */}
        <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm text-foreground text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-gold" />
          AI Pick
        </div>
      </div>

      {/* Content */}
      <div className="flex items-start gap-2 mb-2">
        <div className={item.isVeg ? "badge-veg flex-shrink-0 mt-1" : "badge-nonveg flex-shrink-0 mt-1"} />
        <h3 className="font-bold text-foreground text-base leading-tight">{item.name}</h3>
      </div>

      {/* Combo items */}
      {item.comboItems && item.comboItems.length > 0 && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {item.comboItems.join(" • ")}
        </p>
      )}

      {/* Rating */}
      <div className="flex items-center gap-1 mb-3">
        <div className="flex items-center gap-0.5 bg-veg/10 text-veg px-1.5 py-0.5 rounded text-xs font-semibold">
          <Star className="w-3 h-3 fill-current" />
          {item.rating}
        </div>
        <span className="text-xs text-muted-foreground">({item.ratingCount})</span>
      </div>

      {/* Price + Add */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-foreground">₹{item.price}</span>
            {item.originalPrice && (
              <span className="text-sm text-muted-foreground line-through">
                ₹{item.originalPrice}
              </span>
            )}
          </div>
          {item.goldPrice && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="badge-gold text-[10px]">GOLD</span>
              <span className="text-xs font-semibold text-gold">₹{item.goldPrice}</span>
            </div>
          )}
        </div>

        {quantity === 0 ? (
          <button
            onClick={() => addItem(item)}
            className="bg-card border-2 border-primary text-primary font-bold px-5 py-1.5 rounded-lg shadow-sm hover:bg-primary hover:text-primary-foreground transition-all text-sm"
          >
            ADD
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-primary rounded-lg shadow-md overflow-hidden">
            <button
              onClick={() => removeItem(item.id)}
              className="p-2 text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-primary-foreground font-bold min-w-[24px] text-center">
              {quantity}
            </span>
            <button
              onClick={() => addItem(item)}
              className="p-2 text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
