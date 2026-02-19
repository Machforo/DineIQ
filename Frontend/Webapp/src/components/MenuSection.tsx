import { useRef } from "react";
import { MenuItem } from "@/lib/data";
import DishCard from "./DishCard";
import ComboCard from "./ComboCard";
import { Sparkles, ChefHat, UtensilsCrossed, ChevronLeft, ChevronRight } from "lucide-react";
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
  combos: "bg-gradient-to-br from-orange-50/50 via-red-50/30 to-pink-50/50",
  chef: "bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-orange-50/50",
  standard: "bg-white",
};

const iconStyles = {
  combos: "bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg",
  chef: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg",
  standard: "bg-gray-100 text-gray-600",
};

export default function MenuSection({ title, subtitle, items, type }: MenuSectionProps) {
  const { isVegMode } = useUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const Icon = sectionIcons[type];

  const filteredItems = isVegMode ? items.filter((item) => item.isVeg) : items;

  if (filteredItems.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const isHorizontal = type === "combos" || type === "chef";

  return (
    <section className={`py-5 ${sectionStyles[type]} transition-all duration-300`}>
      {/* Clean Header — only shown when title is provided */}
      {title && (
        <div className="px-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-1 h-7 rounded-full ${type === "combos" ? "bg-[#E23744]" : type === "chef" ? "bg-[#E23744]" : "bg-[#E23744]"}`} />
            <div>
              <h2 className="text-xl font-black text-gray-900">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>

          {/* Scroll Arrows for horizontal sections */}
          {isHorizontal && (
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => scroll("left")}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm hover:border-gray-300 transition-all active:scale-95"
                aria-label="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => scroll("right")}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm hover:border-gray-300 transition-all active:scale-95"
                aria-label="Scroll Right"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="relative">
        {type === "combos" ? (
          <div
            ref={scrollRef}
            className="flex gap-5 px-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-2 scroll-smooth"
          >
            {filteredItems.map((item) => (
              <ComboCard key={item.id} item={item} />
            ))}
          </div>
        ) : type === "chef" ? (
          <div
            ref={scrollRef}
            className="flex gap-5 px-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-2 scroll-smooth"
          >
            {filteredItems.map((item) => (
              <div key={item.id} className="flex-shrink-0 w-96 md:w-[420px] snap-center">
                <DishCard item={item} />
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 space-y-4">
            {filteredItems.map((item) => (
              <DishCard key={item.id} item={item} compact />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
