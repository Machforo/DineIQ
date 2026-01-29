import { MenuItem } from "@/lib/data";
import DishCard from "./DishCard";
import ComboCard from "./ComboCard";
import { Sparkles, ChefHat, UtensilsCrossed } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface MenuSectionProps {
  title: string;
  subtitle?: string;
  items: MenuItem[];
  type: "combos" | "chef" | "standard";
}

const sectionIcons = {
  combos: Sparkles,
  chef: ChefHat,
  standard: UtensilsCrossed,
};

const sectionStyles = {
  combos: "bg-primary/5",
  chef: "bg-gold/5",
  standard: "bg-background",
};

export default function MenuSection({ title, subtitle, items, type }: MenuSectionProps) {
  const { isVegMode } = useUser();
  const Icon = sectionIcons[type];

  const filteredItems = isVegMode ? items.filter((item) => item.isVeg) : items;

  if (filteredItems.length === 0) return null;

  return (
    <section className={`py-5 ${sectionStyles[type]}`}>
      {/* Header */}
      <div className="px-4 mb-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          type === "combos" ? "bg-primary/10" : type === "chef" ? "bg-gold/10" : "bg-muted"
        }`}>
          <Icon className={`w-5 h-5 ${
            type === "combos" ? "text-primary" : type === "chef" ? "text-gold" : "text-muted-foreground"
          }`} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Items */}
      {type === "combos" ? (
        <div className="flex gap-4 px-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-2">
          {filteredItems.map((item) => (
            <ComboCard key={item.id} item={item} />
          ))}
        </div>
      ) : type === "chef" ? (
        <div className="flex gap-4 px-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-2">
          {filteredItems.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-80 snap-center">
              <DishCard item={item} />
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {filteredItems.map((item) => (
            <DishCard key={item.id} item={item} compact />
          ))}
        </div>
      )}
    </section>
  );
}
