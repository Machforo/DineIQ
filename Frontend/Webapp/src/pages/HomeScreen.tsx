import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import HomeHeader from "@/components/HomeHeader";
import HeroBanner from "@/components/HeroBanner";
import OfferCarousel from "@/components/OfferCarousel";
import CategoryScroll from "@/components/CategoryScroll";
import MenuSection from "@/components/MenuSection";
import CartBar from "@/components/CartBar";
import AIButton from "@/components/AIButton";
import { saveLog } from "@/utils/logger";
import { api } from "@/api";
import { MenuItem, Category } from "@/lib/data";
import { extractDynamicCategories, getMenuItemImage } from "@/lib/categoryUtils";
import { Ticket, Percent, Gift, Sparkles, RefreshCw } from "lucide-react";
import AIComboCard from "@/components/AIComboCard";


// Flag for AI vs Smart Combos
const GENERATE_AI_COMBOS = true;

export default function HomeScreen() {
  const navigate = useNavigate();
  const { isLoggedIn, user, setFullMenu } = useUser();

  const [offers, setOffers] = useState([]);
  const [combos, setCombos] = useState<MenuItem[]>([]);
  const [chefSpecials, setChefSpecials] = useState<MenuItem[]>([]);
  const [bestsellers, setBestsellers] = useState<MenuItem[]>([]);
  const [curatedItems, setCuratedItems] = useState<MenuItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<Category[]>([]);
  const [aiCombos, setAiCombos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Coupon codes data
  const coupons = [
    {
      code: "DINE50",
      title: "Flat KSh 50 OFF",
      subtitle: "On orders above KSh 299",
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
      title: "KSh 100 OFF",
      subtitle: "First order bonus",
      icon: Gift,
      color: "from-purple-500 to-pink-500"
    }
  ];

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
    } else {
      const userEmail = user?.email || "guest@dineiq.com";
      // saveLog(userEmail, "PAGE_VIEW", "User landed on Home Screen"); // Removed as per request

      const loadData = async () => {
        setIsLoading(true);

        try {
          // 1. Fetch Offers
          const offersData = await api.fetchOffers();
          if (offersData?.offers) setOffers(offersData.offers);

          // 2. Fetch Menu
          const menuData = await api.fetchMenu(userEmail);

          if (menuData?.status === "success" && menuData?.menu_sections) {
            const sections = menuData.menu_sections;
            const allItems: MenuItem[] = [];
            let chefTemp: MenuItem[] = [];
            let bestTemp: MenuItem[] = [];
            let curatedTemp: MenuItem[] = [];

            // Map backend items to frontend format
            const mapToMenuItem = (item: any, category: string): MenuItem => {
              return {
                id: String(item.Item_ID || item.id || ''),
                name: item.Item_Name || item.name || 'Unknown Item',
                description: item.Item_Description || item.description || '',
                price: parseFloat(String(item.Current_Price || item.price || 0).replace(/,/g, "")),
                category: item.Item_Category || category || 'Other',
                image: getMenuItemImage(item),
                isVeg: String(item.Is_Veg || item.isVeg).toLowerCase() === 'true',
                rating: 4.5,
                ratingCount: 10,
              };
            };

            // Process sections
            Object.entries(sections).forEach(([category, items]: [string, any[]]) => {
              const mapped = items.map(item => mapToMenuItem(item, category));
              allItems.push(...mapped);
              
              if (category === "Chef Special" || category === "Chef's Recommendations") chefTemp.push(...mapped);
              else if (category === "Bestseller") bestTemp.push(...mapped);
              else if (category === "Curated for You") curatedTemp.push(...mapped);
            });

            // Deduplicate all menu items
            const uniqueAllItems = Array.from(new Map(allItems.map(i => [i.id, i])).values());

            setFullMenu(uniqueAllItems);
            setMenuItems(uniqueAllItems);
            setDynamicCategories(extractDynamicCategories(sections));
            setChefSpecials(chefTemp);
            setBestsellers(bestTemp);
            setCuratedItems(curatedTemp);
            setCombos(generateSmartCombos(uniqueAllItems));

            // 3. Initialize AI Combos with Smart Combos and fetch AI in background
            const smartCombos = generateSmartCombos(uniqueAllItems);
            setAiCombos(smartCombos);

            if (GENERATE_AI_COMBOS && userEmail !== "guest@dineiq.com") {
              // Non-blocking background fetch
              api.generateCombos(3, userEmail)
                .then(aiData => {
                  if (aiData?.combos && aiData.combos.length > 0) {
                    setAiCombos(aiData.combos);
                  }
                })
                .catch(err => console.error("❌ Failed to fetch AI combos:", err));
            }
          }
        } catch (e) {
          console.error("❌ Error loading Home Screen data:", e);
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
  const { isVegMode } = useUser();

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);

    // Log category selection
    saveLog(user?.email || "Guest", "CATEGORY_CLICK", category);

    // Special Case: Chef Specials -> Jump to standalone section
    if (category === "Chef Special" || category === "Chef's Specials") {
      const element = document.getElementById("chef-recs");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    // Find category object to get ID
    const catObj = dynamicCategories.find(c => c.name === category);
    if (catObj) {
      const elementId = `category-${catObj.id}`;
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleSearch = useCallback((query: string) => {
    if (query.length >= 3) {
      saveLog(user?.email || "Guest", "SEARCH_ITEM", query);
    }
    setSearchQuery(query);
  }, [user?.email]);

  // Filter items for "All Dishes" section
  const filteredMenuItems = isVegMode ? menuItems.filter(i => i.isVeg === true) : menuItems;

  const displayedItems = searchQuery
    ? filteredMenuItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : filteredMenuItems;


  // Generate smart combos from menu items
  const generateSmartCombos = (items: MenuItem[]): MenuItem[] => {
    const combos: MenuItem[] = [];

    // Find items by category using project-specific naming
    const starters = items.filter(i => i.category.toUpperCase().includes('STARTER'));
    const mains = items.filter(i => i.category.toUpperCase().includes('MAIN'));
    const grills = items.filter(i => i.category.toUpperCase().includes('GRILL'));
    const sides = items.filter(i => i.category.toUpperCase().includes('SIDE'));
    const burgers = items.filter(i => i.category.toUpperCase().includes('BURGER') || i.category.toUpperCase().includes('SANDWICH'));
    const pasta = items.filter(i => i.category.toUpperCase().includes('PASTA'));

    // Combo 1: Grand Grill Platter (Grill + Starter + Side)
    if (grills.length && starters.length && sides.length) {
      const totalPrice = grills[0].price + starters[0].price + sides[0].price;
      combos.push({
        id: 'combo_grill_feast',
        name: 'Grand Grill Feast',
        description: `${grills[0].name} • ${starters[0].name} • ${sides[0].name}`,
        price: Math.round(totalPrice * 0.8), // 20% off
        image: grills[0].image,
        isVeg: grills[0].isVeg === true && starters[0].isVeg === true && sides[0].isVeg === true,
        category: 'Combos',
        rating: 4.8,
        ratingCount: 142
      });
    }

    // Combo 2: Quick Harvest Lunch (Burger/Sandwich + Side)
    if (burgers.length && sides.length) {
      const totalPrice = burgers[0].price + sides[0].price;
      combos.push({
        id: 'combo_quick_lunch',
        name: 'Quick Harvest Lunch',
        description: `${burgers[0].name} • ${sides[0].name} • Refreshment`,
        price: Math.round(totalPrice * 0.85), // 15% off
        image: burgers[0].image,
        isVeg: burgers[0].isVeg === true && sides[0].isVeg === true,
        category: 'Combos',
        rating: 4.5,
        ratingCount: 89
      });
    }

    // Combo 3: Italian Feast (Pasta + Starter)
    if (pasta.length && starters.length) {
      const totalPrice = pasta[0].price + starters[0].price;
      combos.push({
        id: 'combo_italian_special',
        name: 'Italian Harvest Special',
        description: `${pasta[0].name} • ${starters[0].name}`,
        price: Math.round(totalPrice * 0.82), // 18% off
        image: pasta[0].image,
        isVeg: pasta[0].isVeg === true && starters[0].isVeg === true,
        category: 'Combos',
        rating: 4.7,
        ratingCount: 112
      });
    }

    // Combo 4: Complete Land/Sea Meal (Main + Starter)
    if (mains.length && starters.length) {
      const totalPrice = mains[0].price + starters[0].price;
      combos.push({
        id: 'combo_complete_meal',
        name: 'Complete Harvest Meal',
        description: `${mains[0].name} • ${starters[0].name} • Chef's Choice Side`,
        price: Math.round(totalPrice * 0.75), // 25% off (Higher value)
        image: mains[0].image,
        isVeg: mains[0].isVeg === true && starters[0].isVeg === true,
        category: 'Combos',
        rating: 4.9,
        ratingCount: 201
      });
    }

    return combos.slice(0, 3); // Return top 3 dynamic combos
  };

  // Re-implementing generateSmartCombos properly to avoid breaking active code
  // usage: const combosTemp = generateSmartCombos(allItems);


  const handleBannerClick = (offer: any) => {
    // Log banner click
    saveLog(user?.email || "Guest", "CHEF_SPECIAL_CARD_CLICK", offer.title);

    // Clear search if any
    setSearchQuery("");

    // Allow a brief render cycle for sections to reappear
    setTimeout(() => {
      // Logic to scroll based on offer content
      const title = offer.title?.toLowerCase() || "";
      const subtitle = offer.subtitle?.toLowerCase() || "";

      if (title.includes("welcome") || title.includes("offer") || title.includes("combo") || subtitle.includes("combo")) {
        // Welcome Offer or Combo Banner -> Jump to Combos Section
        const element = document.getElementById("ai-combos") || document.getElementById("smart-combos");
        if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (title.includes("chef") || subtitle.includes("chef") || title.includes("special")) {
        // Jump to Chef's Specials Section
        const element = document.getElementById("chef-recs");
        if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (title.includes("best") || title.includes("seller")) {
        // Jump to Bestsellers Section
        const element = document.getElementById("bestsellers-section");
        if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        // Default (Check Menu) -> Jump to Curated for You section
        const curatedSection = document.getElementById("curated-section");
        if (curatedSection) {
          curatedSection.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (dynamicCategories.length > 0) {
          // Fallback to first non-special category
          const firstCat = dynamicCategories.find(c => c.name !== "Chef Special" && c.name !== "Bestseller") || dynamicCategories[0];
          const element = document.getElementById(`category-${firstCat.id}`);
          if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }, 100);
  };

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 pb-32">
      <HomeHeader onSearch={handleSearch} searchQuery={searchQuery} />

      <main className="animate-fade-in flex flex-col gap-6 pt-0"> {/* Removed top padding for Hero edge-to-edge */}

        {/* Only show Hero & Banners if NOT searching */}
        {!searchQuery && (
          <>
            {/* 1. Hero Banner */}
            <HeroBanner onOrderNow={() => {
              saveLog(user?.email || "Guest", "VIEW_MENU_BANNER_CLICK", "User clicked Check Menu in Hero Banner");
              
              const curatedSection = document.getElementById("curated-section");
              if (curatedSection) {
                curatedSection.scrollIntoView({ behavior: "smooth", block: "start" });
              } else if (dynamicCategories.length > 0) {
                // Fallback to first non-special category
                const firstCat = dynamicCategories.find(c => c.name !== "Chef Special" && c.name !== "Bestseller") || dynamicCategories[0];
                const element = document.getElementById(`category-${firstCat.id}`);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }
            }} />

            {/* 2. Offers (Discount Cards) */}
            <div className="px-0 relative -mt-4 z-10"> {/* Slight negative margin overlap */}
              <OfferCarousel offers={offers} onBannerClick={handleBannerClick} />
            </div>

            {/* 3. Categories (What's in your mind?) */}
            {!isLoading && (
              <div className="bg-transparent py-2">
                <CategoryScroll
                  categories={dynamicCategories.filter(category => {
                    if (category.name === "Chef Special" || category.name === "Bestseller" || category.name === "Chef's Recommendations" || category.name === "Combos") return false;
                    const categoryItems = menuItems.filter(item => item.category === category.name);
                    return !isVegMode || categoryItems.some(item => item.isVeg === true);
                  })}
                  onSelect={handleCategorySelect}
                  selectedCategory={selectedCategory || undefined}
                />
              </div>
            )}

            {/* Combined Combo Logic: Follow GENERATE_AI_COMBOS flag */}
            {GENERATE_AI_COMBOS ? (
              aiCombos.length > 0 && (
                <div id="ai-combos" className="py-2 scroll-mt-24 bg-transparent mb-4">
                  <div className="mx-4 mb-4 p-4 rounded-2xl flex items-center justify-between bg-indigo-50 border border-indigo-100/50">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-5 h-5 text-indigo-500 fill-indigo-500" />
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">AI Harvest Combos</h2>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">Personalized deals based on your history & tastes</p>
                    </div>
                  </div>

                  <div className="flex gap-4 px-4 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory scroll-smooth">
                    {aiCombos.map((combo) => (
                      <AIComboCard key={combo.Item_ID} combo={combo} />
                    ))}
                  </div>
                </div>
              )
            ) : (
              !isLoading && (isVegMode ? combos.filter(c => c.isVeg === true) : combos).length > 0 && (
                <div id="smart-combos" className="scroll-mt-24">
                  <MenuSection
                    title="🎁 Smart Combos"
                    subtitle="AI-curated combo deals - Save more!"
                    items={isVegMode ? combos.filter(c => c.isVeg === true) : combos}
                    type="combos"
                  />
                </div>
              )
            )}
          </>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading delicious menu...</p>
          </div>
        )}

        {/* SEARCH RESULTS */}
        {!isLoading && searchQuery && displayedItems.length > 0 && (
          <div className="px-3 scroll-mt-24">
            <MenuSection
              title={`Search Results for "${searchQuery}"`}
              subtitle={`${displayedItems.length} items found`}
              items={displayedItems}
              type="standard"
            />
          </div>
        )}

        {/* Chef's Specials (Standalone) */}
        {!isLoading && (isVegMode ? chefSpecials.filter(c => c.isVeg === true) : chefSpecials).length > 0 && !searchQuery && (
          <div id="chef-recs" className="scroll-mt-24">
            <MenuSection
              title="⭐ Chef's Specials"
              subtitle="Premium dishes handpicked for you"
              items={isVegMode ? chefSpecials.filter(c => c.isVeg === true) : chefSpecials}
              type="chef"
            />
          </div>
        )}

        {/* Bestsellers (Standalone) */}
        {!isLoading && (isVegMode ? bestsellers.filter(c => c.isVeg === true) : bestsellers).length > 0 && !searchQuery && (
          <div id="bestsellers-section" className="scroll-mt-24">
            <MenuSection
              title="🔥 Bestsellers"
              subtitle="Most popular picks this week"
              items={isVegMode ? bestsellers.filter(c => c.isVeg === true) : bestsellers}
              type="bestseller"
            />
          </div>
        )}

        {/* Curated for You (DYNAMIC - Vertical) */}
        {!isLoading && curatedItems.length > 0 && !searchQuery && (
          <div id="curated-section" className="scroll-mt-24 px-3">
            <MenuSection
              title="✨ Curated for You"
              subtitle="Your favorite picks sorted by frequency"
              items={isVegMode ? curatedItems.filter(c => c.isVeg === true) : curatedItems}
              type="standard"
            />
          </div>
        )}

        {/* MAIN MENU SECTIONS (Dynamic Categories - Browse Mode) */}
        {!isLoading && !searchQuery && dynamicCategories.map((category) => {
          // Skip standalone / virtual sections to avoid duplication in main menu flow
          if (category.name === "Chef Special" ||
            category.name === "Bestseller" ||
            category.name === "Chef's Recommendations" ||
            category.name === "Curated for You" ||
            (GENERATE_AI_COMBOS && category.name === "Combos")) return null;

          // Filter items for this category
          const categoryItems = menuItems.filter(item => item.category === category.name);

          // Veg Mode Check: Ensure we don't render empty sections if all items are filtered out
          const visibleItems = isVegMode ? categoryItems.filter(i => i.isVeg === true) : categoryItems;

          if (visibleItems.length === 0) return null;

          // Determine Section Type
          let sectionType: "standard" | "chef" | "combos" = "standard";
          if (category.name === "Bestseller") sectionType = "standard"; // Bestsellers usually list
          if (category.name === "Your Favorites") sectionType = "standard";

          return (
            <div key={category.id} id={`category-${category.id}`} className="px-3 scroll-mt-24">
              <MenuSection
                title={category.name}
                subtitle={category.tagline}
                items={visibleItems}
                type={sectionType}
              />
            </div>
          );
        })}

        {/* Empty State */}
        {!isLoading && searchQuery && displayedItems.length === 0 && (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-xl font-semibold text-gray-700">No items found</p>
            <button onClick={() => { setSearchQuery(""); }} className="text-orange-600 font-bold mt-2">Clear Search</button>
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