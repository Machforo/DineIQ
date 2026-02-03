import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import HomeHeader from "@/components/HomeHeader";
import OfferCarousel from "@/components/OfferCarousel";
import CategoryScroll from "@/components/CategoryScroll";
import MenuSection from "@/components/MenuSection";
import CartBar from "@/components/CartBar";
import AIButton from "@/components/AIButton";
import { combos, chefSpecials, menuItems } from "@/lib/data";

export default function HomeScreen() {
  const navigate = useNavigate();
  const { isLoggedIn } = useUser();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) return null;
  

  return (
    // Background updated to Light Gray (#F4F5F7) for contrast
    <div className="min-h-screen bg-[#F4F5F7] pb-32">
      <HomeHeader />
      
      {/* Main Content with dense spacing */}
      <main className="animate-fade-in flex flex-col gap-4 pt-4">
        
        {/* Banners */}
        <div className="px-0">
           <OfferCarousel />
        </div>
        
        {/* Categories */}
        <div className="bg-white py-4 shadow-sm">
           <CategoryScroll />
        </div>

        {/* Priority 1: Smart Combos - AI Generated */}
        {/* Added 'px-3' to tighten margins */}
        <div className="px-3">
          <MenuSection
            title="Smart Combos"
            subtitle="AI-curated deals for your group"
            items={combos}
            type="combos"
          />
        </div>

        {/* Priority 2: Chef's Recommendations */}
        <div className="px-3">
          <MenuSection
            title="Chef's Recommendations"
            subtitle="Premium dishes crafted with love"
            items={chefSpecials}
            type="chef"
          />
        </div>

        {/* Priority 3: Standard Menu */}
        <div className="px-3">
          <MenuSection
            title="All Dishes"
            subtitle="Explore our complete menu"
            items={menuItems}
            type="standard"
          />
        </div>
      </main>

      <AIButton />
      <CartBar />
    </div>
  );
}
