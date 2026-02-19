import { ChevronRight } from "lucide-react";
import { Offer } from "@/lib/data";
// @ts-ignore
import heroVideo from "@/assets/hero-video.mp4";

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
              style={{ backgroundColor: offer.bgColor?.startsWith('#') ? offer.bgColor : undefined }}
              className={`cursor-pointer relative flex-shrink-0 w-[92vw] max-w-[500px] h-48 rounded-2xl overflow-hidden snap-center ${!offer.bgColor?.startsWith('#') ? (offer.bgColor || 'bg-red-500') : ''} active:scale-95 transition-transform shadow-lg`}
            >
              {/* Removed Background Image as requested */}

              {/* Content */}
              <div className="relative h-full p-6 flex flex-col justify-between text-white">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest opacity-90 mb-1 block">
                    {offer.subtitle}
                  </span>
                  <h3 className="text-3xl font-black tracking-tight">{offer.title}</h3>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-baseline gap-2">
                    {/* Placeholder for discount if needed later */}
                  </div>
                  <button className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold shadow-md hover:bg-gray-100 transition-colors">
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
