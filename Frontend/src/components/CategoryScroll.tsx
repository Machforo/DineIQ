import { categories } from "@/lib/data";

interface CategoryScrollProps {
  onSelect: (category: string) => void;
  selectedCategory?: string;
}

export default function CategoryScroll({ onSelect, selectedCategory }: CategoryScrollProps) {
  return (
    <section className="py-4">
      <h2 className="px-4 text-lg font-bold text-foreground mb-3">What's on your mind?</h2>
      <div className="flex gap-4 px-4 overflow-x-auto hide-scrollbar pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelect(category.name)}
            className="flex-shrink-0 flex flex-col items-center gap-2 group"
          >
            <div className={`w-20 h-20 rounded-full overflow-hidden border-2 transaction-all shadow-md ${selectedCategory === category.name ? 'border-orange-500 scale-105' : 'border-transparent group-hover:border-primary'}`}>
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
              />
            </div>
            <span className={`text-sm font-medium transition-colors ${selectedCategory === category.name ? 'text-orange-600 font-bold' : 'text-foreground group-hover:text-primary'}`}>
              {category.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
