import { categories } from "@/lib/data";

export default function CategoryScroll() {
  return (
    <section className="py-4">
      <h2 className="px-4 text-lg font-bold text-foreground mb-3">What's on your mind?</h2>
      <div className="flex gap-4 px-4 overflow-x-auto hide-scrollbar pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            className="flex-shrink-0 flex flex-col items-center gap-2 group"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary transition-all shadow-md">
              <img
                src={category.image}
                alt={category.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
              />
            </div>
            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {category.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
