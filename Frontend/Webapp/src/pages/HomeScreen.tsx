import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import HomeHeader, { HomeHeaderHandle } from "@/components/HomeHeader";
import HeroBanner from "@/components/HeroBanner";
import OfferCarousel from "@/components/OfferCarousel";
import CategoryScroll from "@/components/CategoryScroll";
import MenuSection from "@/components/MenuSection";
import CartBar from "@/components/CartBar";
import AIButton from "@/components/AIButton";
import AIComboCard from "@/components/AIComboCard";
import { saveLog } from "@/utils/logger";
import { api } from "@/api";
import { MenuItem } from "@/lib/data";
import { Ticket, Percent, Gift, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

import { API_BASE_URL } from "@/config";

export default function HomeScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const headerRef = useRef<HomeHeaderHandle>(null);
  const { isLoggedIn, user, setFullMenu } = useUser();

  // Handle search focus from navigation
  useEffect(() => {
    if (location.state?.focusSearch) {
      setTimeout(() => {
        headerRef.current?.focusSearch();
        // Clear state nicely
        navigate(location.pathname, { replace: true, state: {} });
      }, 100);
    }
  }, [location.state, navigate, location.pathname]);

  const [offers, setOffers] = useState([]);
  const [combos, setCombos] = useState<MenuItem[]>([]);
  const [aiCombos, setAiCombos] = useState<any[]>([]); // AI-generated combos
  const [chefSpecials, setChefSpecials] = useState<MenuItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAICombos, setIsLoadingAICombos] = useState(false);

  // Coupon codes data
  const coupons = [
    {
      code: "DINE50",
      title: "Flat ₹50 OFF",
      subtitle: "On orders above ₹299",
      icon: Ticket,
      color: "from-orange-500 to-red-500"
    },
    {
      code: "COMBO30",
      title: "30% OFF",
      subtitle: "On all combo meals",
      icon: Percent,
      color: "from-green-500 to-emerald-500"
    },
    {
      code: "FIRST100",
      title: "₹100 OFF",
      subtitle: "First order bonus",
      icon: Gift,
      color: "from-purple-500 to-pink-500"
    }
  ];

  // Fetch AI-powered combos
  const loadAICombos = async () => {
    try {
      setIsLoadingAICombos(true);
      const userEmail = user?.email || "";

      console.log("🤖 Fetching AI combos for:", userEmail);

      const response = await axios.post(
        `${API_BASE_URL}/generate-combos`,
        {
          num_combos: 3,
          email: userEmail
        }
      );

      console.log("🎯 AI Combos Response:", response.data);

      if (response.data?.combos && response.data.combos.length > 0) {
        setAiCombos(response.data.combos);
        saveLog(userEmail, "AI_COMBOS_LOADED", `Loaded ${response.data.combos.length} AI combos`);
        toast.success("✨ Fresh AI combos generated!", {
          description: `${response.data.combos.length} personalized combos ready`
        });
      } else {
        console.warn("⚠️ No AI combos received");
        toast.info("Using smart combos instead");
      }
    } catch (error) {
      console.error("❌ Error loading AI combos:", error);
      toast.error("Could not load AI combos, showing smart combos");
    } finally {
      setIsLoadingAICombos(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
    } else {
      const userEmail = user?.email || "guest@dineiq.com";
      saveLog(userEmail, "PAGE_VIEW", "User landed on Home Screen");

      const loadData = async () => {
        setIsLoading(true);

        try {
          // 1. Fetch Offers
          const offersData = await api.fetchOffers();
          if (offersData?.offers) setOffers(offersData.offers);

          // 2. Fetch Menu
          const menuData = await api.fetchMenu(userEmail);
          console.log("📥 Menu Data:", menuData);

          if (menuData?.status === "success" && menuData?.menu_sections) {
            const sections = menuData.menu_sections;
            const allItems: MenuItem[] = [];
            let combosTemp: MenuItem[] = [];
            let chefTemp: MenuItem[] = [];

            // Map backend items to frontend format
            const mapToMenuItem = (item: any, category: string): MenuItem => {
              return {
                id: String(item.Item_ID || item.id || ''),
                name: item.Item_Name || item.name || 'Unknown Item',
                description: item.Item_Description || item.description || item.Item_Category || '',
                price: parseFloat(String(item.Current_Price || item.price || 0)),
                image: item.Image_URL || item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
                isVeg: Boolean(item.Is_Veg || item.isVeg),
                category: item.Item_Category || category || 'Other',
                rating: 4.5,
                ratingCount: 100,
                comboItems: item.Combo_Items || [],
                isCombo: category === "Combos" || (item.Combo_Items && item.Combo_Items.length > 0) || Boolean(item.isCombo),
              };
            };

            // Process menu sections
            Object.entries(sections).forEach(([sectionName, items]: [string, any]) => {
              if (Array.isArray(items)) {
                items.forEach((item: any) => {
                  const menuItem = mapToMenuItem(item, sectionName);
                  allItems.push(menuItem);

                  // Filter for specific sections
                  if (sectionName === "Combos" || sectionName.includes("Family")) {
                    combosTemp.push(menuItem);
                  }
                  if (sectionName === "Chef Special" || sectionName === "Bestseller") {
                    chefTemp.push(menuItem);
                  }
                });
              }
            });

            console.log(`✅ Loaded ${allItems.length} items`);
            setFullMenu(allItems);
            setMenuItems(allItems);

            // Generate smart combos if none exist
            if (combosTemp.length === 0) {
              combosTemp = generateSmartCombos(allItems);
            }

            setCombos(combosTemp);
            setChefSpecials(chefTemp);
          }

          // 3. Load AI Combos after menu is loaded
          await loadAICombos();

        } catch (e) {
          console.error("❌ Error:", e);
        } finally {
          setIsLoading(false);
        }
      };

      loadData();
    }
  }, [isLoggedIn, navigate, user]);

  /* --- Navigation & Filtering Logic --- */
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCategorySelect = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
      setSearchQuery("");
    }
  };

  const handleSearch = useCallback((query: string) => {
    console.log("🔍 Search Query:", query);
    setSearchQuery(query);
    if (query) {
      setSelectedCategory(null);
    }
  }, []);

  // Filter items for "All Dishes" section
  const displayedItems = searchQuery
    ? menuItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : selectedCategory
      ? menuItems.filter((item) =>
        item.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        item.name.toLowerCase().includes(selectedCategory.toLowerCase())
      )
      : menuItems;

  // Generate smart combos from menu items
  const generateSmartCombos = (items: MenuItem[]): MenuItem[] => {
    const combos: MenuItem[] = [];

    const getItemsByCategory = (cat: string) =>
      items.filter(i => i.category.toLowerCase().includes(cat.toLowerCase()));

    const riceItems = getItemsByCategory('rice');
    const gravyItems = getItemsByCategory('gravy');
    const breadItems = getItemsByCategory('bread');
    const starterItems = getItemsByCategory('starter');

    // Combo 1: Family Feast
    if (riceItems.length && gravyItems.length && breadItems.length) {
      const totalPrice = riceItems[0].price + gravyItems[0].price + breadItems[0].price;
      combos.push({
        id: 'combo_1',
        name: 'Family Feast Combo',
        description: `${riceItems[0].name} • ${gravyItems[0].name} • ${breadItems[0].name}`,
        price: Math.round(totalPrice * 0.8),
        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
        isVeg: true,
        category: 'Combos',
        rating: 4.6,
        ratingCount: 156
      });
    }

    // Combo 2: Quick Meal
    if (gravyItems.length > 1 && breadItems.length > 1) {
      const totalPrice = gravyItems[1].price + breadItems[1].price;
      combos.push({
        id: 'combo_2',
        name: 'Quick Meal Combo',
        description: `${gravyItems[1].name} • ${breadItems[1].name} • Raita`,
        price: Math.round(totalPrice * 0.85),
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d',
        isVeg: true,
        category: 'Combos',
        rating: 4.4,
        ratingCount: 98
      });
    }

    // Combo 3: Complete Meal
    if (starterItems.length && riceItems.length && gravyItems.length) {
      const totalPrice = starterItems[0].price + riceItems[0].price + gravyItems[0].price;
      combos.push({
        id: 'combo_3',
        name: 'Complete Meal Combo',
        description: `${starterItems[0].name} • ${riceItems[0].name} • ${gravyItems[0].name}`,
        price: Math.round(totalPrice * 0.75),
        image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0',
        isVeg: true,
        category: 'Combos',
        rating: 4.7,
        ratingCount: 234
      });
    }

    return combos.slice(0, 3);
  };

  const handleBannerClick = (offer: any) => {
    setSelectedCategory(null);
    setSearchQuery("");

    setTimeout(() => {
      const title = offer.title?.toLowerCase() || "";
      const subtitle = offer.subtitle?.toLowerCase() || "";

      if (title.includes("combo") || subtitle.includes("combo")) {
        const element = document.getElementById("ai-combos-section");
        if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (title.includes("chef") || subtitle.includes("chef") || title.includes("special")) {
        const element = document.getElementById("chef-recs");
        if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        const element = document.getElementById("all-dishes");
        if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50 pb-24 relative overflow-x-hidden">
      {/* Vibrant Background Pattern */}
      <div className="fixed inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(244, 67, 54, 0.08) 0%, transparent 50%),
                          radial-gradient(circle at 80% 80%, rgba(255, 193, 7, 0.08) 0%, transparent 50%),
                          radial-gradient(circle at 40% 20%, rgba(33, 150, 243, 0.06) 0%, transparent 50%)`
      }} />

      {/* Decorative Dots Pattern */}
      <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, rgba(244, 67, 54, 0.15) 1px, transparent 0)`,
        backgroundSize: '48px 48px'
      }} />

      <HomeHeader ref={headerRef} onSearch={handleSearch} searchQuery={searchQuery} />

      <main className="animate-fade-in flex flex-col gap-6 pt-0 relative z-10">

        {/* Only show Hero & Banners if NOT searching/filtering */}
        {!searchQuery && !selectedCategory && (
          <>
            {/* 1. Hero Banner */}
            <HeroBanner onOrderNow={() => {
              const element = document.getElementById("all-dishes");
              if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
            }} />

            {/* 2. Offers (Discount Cards) */}
            <div className="px-0 relative -mt-4 z-10">
              <OfferCarousel offers={offers} onBannerClick={handleBannerClick} />
            </div>

            {/* 3. AI-Powered Smart Combos - PREMIUM SECTION */}
            {!isLoading && (aiCombos.length > 0 || combos.length > 0) && (
              <div id="ai-combos-section" className="px-4 scroll-mt-24">
                {/* Show AI Combos if available */}
                {aiCombos.length > 0 ? (
                  <>
                    {/* Premium AI Combos Header */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-10 bg-gradient-to-b from-purple-500 via-pink-500 to-orange-500 rounded-full shadow-lg" />
                          <div>
                            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
                              <Sparkles className="w-7 h-7 text-purple-500 animate-pulse" />
                              AI-Crafted Combos
                            </h2>
                            <p className="text-sm text-gray-600 mt-1.5 flex items-center gap-2">
                              <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                              Personalized just for you • Save up to 15%
                            </p>
                          </div>
                        </div>

                        <Button
                          onClick={loadAICombos}
                          disabled={isLoadingAICombos}
                          variant="outline"
                          size="sm"
                          className="border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all shadow-sm hover:shadow-md"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingAICombos ? 'animate-spin' : ''}`} />
                          {isLoadingAICombos ? 'Generating...' : 'Refresh'}
                        </Button>
                      </div>
                    </div>

                    {/* AI Combos Grid */}
                    {isLoadingAICombos ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-[520px] bg-gradient-to-br from-purple-100/50 via-pink-100/50 to-orange-100/50 animate-pulse rounded-2xl shadow-lg border border-purple-100" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {aiCombos.map((combo, idx) => (
                          <AIComboCard key={combo.Item_ID || idx} combo={combo} />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  /* Fallback to Smart Combos */
                  <div id="smart-combos">
                    <MenuSection
                      title="🎁 Smart Combos"
                      subtitle="AI-curated combo deals - Save more!"
                      items={combos}
                      type="combos"
                    />
                  </div>
                )}

                {/* Premium Divider */}
                <div className="mt-10 mb-6 flex items-center gap-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Explore More</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent" />
                </div>
              </div>
            )}

            {/* 4. Categories (What's in your mind?) */}
            {!isLoading && (
              <div className="bg-white/70 backdrop-blur-md py-4 shadow-sm border-y border-orange-100/50">
                <CategoryScroll
                  onSelect={handleCategorySelect}
                  selectedCategory={selectedCategory || undefined}
                />
              </div>
            )}
          </>
        )}

        {/* Show Categories Row even if filtering by category (but not search) */}
        {!searchQuery && selectedCategory && !isLoading && (
          <div className="bg-white/70 backdrop-blur-md py-4 shadow-sm mb-2 sticky top-16 z-20 border-b border-orange-100/50">
            <CategoryScroll
              onSelect={handleCategorySelect}
              selectedCategory={selectedCategory || undefined}
            />
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-16 text-center">
            <div className="relative inline-block">
              <div className="animate-spin rounded-full h-20 w-20 border-4 border-orange-500 border-t-transparent mx-auto shadow-lg"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-orange-500 animate-pulse" />
              </div>
            </div>
            <p className="mt-6 text-gray-800 font-bold text-xl">Preparing your experience...</p>
            <p className="text-gray-500 text-sm mt-2">Curating the finest dishes just for you</p>
          </div>
        )}

        {/* Chef's Recommendations */}
        {!isLoading && chefSpecials.length > 0 && !selectedCategory && !searchQuery && (
          <div id="chef-recs" className="px-4 scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-10 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full shadow-md" />
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                  ⭐ Chef's Signature Selection
                </h2>
                <p className="text-sm text-gray-600 mt-1.5">
                  Masterfully crafted premium dishes
                </p>
              </div>
            </div>
            <MenuSection
              title=""
              subtitle=""
              items={chefSpecials}
              type="chef"
            />
          </div>
        )}

        {/* All Dishes (or Filtered Results) */}
        {!isLoading && displayedItems.length > 0 && (
          <div id="all-dishes" className="px-4 scroll-mt-24">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-10 bg-gradient-to-b from-orange-500 to-red-600 rounded-full shadow-md" />
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {searchQuery ? `Search: "${searchQuery}"` : selectedCategory ? `${selectedCategory}` : "🍽️ Complete Menu"}
                </h2>
                <p className="text-sm text-gray-600 mt-1.5">
                  {searchQuery ? `${displayedItems.length} items found` : selectedCategory ? `Premium ${selectedCategory} collection` : "Explore our culinary masterpieces"}
                </p>
              </div>
            </div>

            <MenuSection
              title=""
              subtitle=""
              items={displayedItems}
              type="standard"
            />

            {(selectedCategory || searchQuery) && (
              <button
                onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
                className="mx-auto mt-8 w-full max-w-md block text-center text-orange-600 text-sm font-bold p-3.5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 hover:border-orange-400 transition-all shadow-md hover:shadow-lg"
              >
                ← View Complete Menu
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && displayedItems.length === 0 && (
          <div className="p-16 text-center">
            <div className="text-7xl mb-6 animate-bounce">🔍</div>
            <p className="text-2xl font-bold text-gray-800 mb-2">No items found</p>
            <p className="text-gray-500 mb-6">Try adjusting your search or browse our categories</p>
            <button
              onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full font-bold hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Clear Filter & Explore Menu
            </button>
          </div>
        )}
      </main>

      <div
        className="cursor-pointer"
        onClick={() => saveLog(user?.email || "Guest", "CLICK_AI_BUTTON", "User opened AI Assistant")}
        onKeyDown={(e) => e.key === 'Enter' && saveLog(user?.email || "Guest", "CLICK_AI_BUTTON", "User opened AI Assistant")}
        role="button"
        tabIndex={0}
      >
        <AIButton />
      </div>
      <CartBar />
    </div>
  );
}