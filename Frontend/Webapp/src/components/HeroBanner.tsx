import { ChevronRight, Sparkles } from "lucide-react";
// @ts-ignore
import heroVideo from "@/assets/hero-video.mp4";

interface HeroBannerProps {
    onOrderNow?: () => void;
}

export default function HeroBanner({ onOrderNow }: HeroBannerProps) {
    return (
        <div className="relative w-full h-[55vh] max-h-[500px] overflow-hidden rounded-3xl shadow-2xl mb-8 mx-4 animate-slide-up">
            {/* Video Background */}
            <video
                src={heroVideo}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover scale-105"
            />

            {/* Premium Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

            {/* Subtle Pattern Overlay */}
            <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '40px 40px'
            }} />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white text-center flex flex-col items-center">
                {/* Premium Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-[#3D6151] text-white text-xs font-black rounded-full mb-4 uppercase tracking-wider shadow-xl animate-pulse-glow">
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Harvest Highlights</span>
                </div>

                {/* Headline */}
                <h1 className="text-5xl md:text-6xl font-black mb-3 leading-tight font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Harvest <span className="text-gradient-gold">DineIQ</span>
                </h1>

                {/* Subtitle */}
                <p className="text-white/90 text-base md:text-lg font-medium mb-8 max-w-md mx-auto leading-relaxed">
                    Experience the bounty of the valley with our AI-curated organic feasts.
                </p>

                {/* Premium CTA Button */}
                <button
                    onClick={onOrderNow}
                    className="group relative flex items-center gap-3 bg-white text-primary px-10 py-4 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 active:scale-95 overflow-hidden"
                >
                    {/* Button Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                    <span className="relative z-10">Check Menu</span>
                    <ChevronRight className="w-6 h-6 relative z-10 group-hover:translate-x-2 transition-transform duration-300" />
                </button>
            </div>
        </div>
    );
}
