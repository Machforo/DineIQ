import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { restaurantInfo } from "@/lib/data";
import { Utensils } from "lucide-react";

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full border-2 border-foreground/20" />
        <div className="absolute bottom-40 right-10 w-24 h-24 rounded-full border-2 border-foreground/20" />
        <div className="absolute top-1/3 right-1/4 w-16 h-16 rounded-full border-2 border-foreground/20" />
      </div>

      {/* Main content */}
      <div className="animate-scale-in text-center z-10">
        <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
          <Utensils className="w-12 h-12 text-white" />
        </div>

        <h1 className="text-3xl font-extrabold text-white/90 mb-2 tracking-tight font-serif">
          Welcome to
        </h1>
        <h2 className="text-4xl font-black text-white mb-4 font-serif">
          {restaurantInfo.name}
        </h2>
        <p className="text-white/80 text-lg font-medium italic font-serif">
          {restaurantInfo.tagline}
        </p>

        {/* Loading indicator */}
        <div className="mt-12 flex justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce-subtle" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce-subtle" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-white/40 animate-bounce-subtle" style={{ animationDelay: "300ms" }} />
        </div>
      </div>

      {/* Premium badge */}
      <div className="absolute bottom-12 animate-fade-in text-center">
        <div className="bg-white/10 backdrop-blur-sm px-6 py-2 rounded-full border border-white/20">
          <span className="text-sm font-semibold text-white/90 tracking-widest uppercase">
            A Bounty from the Earth
          </span>
        </div>
      </div>
    </div>
  );
}
