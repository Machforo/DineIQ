import { categories } from "@/lib/data";

interface CategoryScrollProps {
  onSelect: (category: string) => void;
  selectedCategory?: string;
}

export default function CategoryScroll({ onSelect, selectedCategory }: CategoryScrollProps) {
  return (
    <section className="py-4 bg-white/50 backdrop-blur-sm">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-800 tracking-tight">What's on your mind?</h2>
        <span className="text-xs font-semibold text-gray-400">See all</span>
      </div>

      <div className="flex gap-4 px-4 overflow-x-auto hide-scrollbar pb-2 snap-x">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelect(category.name)}
            className="flex-shrink-0 flex flex-col items-center gap-2 group snap-center"
          >
            <div className={`relative w-[76px] h-[76px] rounded-full p-[2px] transition-all duration-300 ${selectedCategory === category.name
              ? 'bg-primary shadow-md scale-105'
              : 'bg-transparent group-hover:bg-gray-200'
              }`}>
              <div className="w-full h-full rounded-full overflow-hidden border-[3px] border-white bg-gray-100">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            </div>

            <span className={`text-[12px] font-bold tracking-wide transition-colors ${selectedCategory === category.name
              ? 'text-primary'
              : 'text-gray-600'
              }`}>
              {category.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
