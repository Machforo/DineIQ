import { ChevronRight } from "lucide-react";
import { Offer } from "@/lib/data";

interface OfferCarouselProps {
  offers?: any[];
  onBannerClick?: (offer: any) => void;
}

export default function OfferCarousel({ offers = [], onBannerClick }: OfferCarouselProps) {
  if (!offers.length) return null;

  console.log("OfferCarousel offers:", offers); // Debug

  return (
    <section className="py-4">
      <div className="flex gap-4 px-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory">
        {offers.map((offer) => {
          // Resolve video source: Use imported file if it matches backend path, or absolute URL
          const videoSrc = offer.video === '/hero-video.mp4' ? heroVideo : offer.video;

          return (
            <div
              key={offer.id}
              onClick={() => onBannerClick && onBannerClick(offer)}
              className={`cursor-pointer relative flex-shrink-0 w-[85vw] max-w-[340px] h-40 rounded-2xl overflow-hidden snap-center ${offer.bgColor || 'bg-gray-800'} active:scale-95 transition-transform`}
            >
              <img
                src={offer.image}
                alt={offer.title}
                className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40"
              />

              {/* Content */}
              <div className="relative h-full p-5 flex flex-col justify-between text-white">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
                    {offer.subtitle}
                  </span>
                  <h3 className="text-2xl font-extrabold mt-1">{offer.title}</h3>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">{offer.discount}</span>
                    <span className="text-sm opacity-80">OFF</span>
                  </div>
                  <button className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold">
                    Order Now
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section >
  );
}
