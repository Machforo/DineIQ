import { ChevronRight } from "lucide-react";
// @ts-ignore
import heroVideo from "@/assets/hero-video.mp4";

interface HeroBannerProps {
    onOrderNow?: () => void;
}

export default function HeroBanner({ onOrderNow }: HeroBannerProps) {
    return (
        <div className="relative w-full h-[50vh] max-h-[450px] overflow-hidden shadow-lg mb-6">
            <video
                src={heroVideo}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Dark Overlay/Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white text-center flex flex-col items-center animate-fade-in-up">
                <span className="inline-block px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
                    Steal Deal of the Day
                </span>
                <h1 className="text-4xl md:text-5xl font-black mb-2 leading-tight">
                    Sizzling <span className="text-yellow-400">Combos</span>
                </h1>
                <p className="text-white/90 text-sm md:text-base font-medium mb-6 max-w-xs mx-auto">
                    Get 50% OFF on our premium AI-curated family feasts. limited time offer!
                </p>

                <button
                    onClick={onOrderNow}
                    className="group flex items-center gap-2 bg-white text-red-600 px-8 py-3 rounded-full font-bold text-lg shadow-xl hover:bg-gray-100 transition-all active:scale-95"
                >
                    Check Menu
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
}
