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
import { extractDynamicCategories } from "@/lib/categoryUtils";
import { Ticket, Percent, Gift } from "lucide-react";

export default function HomeScreen() {
  const navigate = useNavigate();
  const { isLoggedIn, user, setFullMenu } = useUser();

  const [offers, setOffers] = useState([]);
  const [combos, setCombos] = useState<MenuItem[]>([]);
  const [chefSpecials, setChefSpecials] = useState<MenuItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
                description: item.Item_Description || item.description || '',
                price: parseFloat(String(item.Current_Price || item.price || 0).replace(/,/g, "")),
                image: item.Image_URL || item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
                isVeg: (item.Is_Veg === true || String(item.Is_Veg).toLowerCase() === 'true') ||
                  (item.isVeg === true || String(item.isVeg).toLowerCase() === 'true'),
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

            // Extract dynamic categories from menu sections
            const extractedCategories = extractDynamicCategories(sections);
            setDynamicCategories(extractedCategories);

            // Generate smart combos if none exist
            if (combosTemp.length === 0) {
              combosTemp = generateSmartCombos(allItems);
            }

            setCombos(combosTemp);
            setChefSpecials(chefTemp);
          }
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
  const { isVegMode } = useUser();

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);

    // Special Case: Chef Special -> Jump to standalone section
    if (category === "Chef Special") {
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
    console.log("🔍 Search Query:", query); // Debug
    setSearchQuery(query);
  }, []);

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

    // Find items by category
    const getItemsByCategory = (cat: string) =>
      items.filter(i => i.category.toLowerCase().includes(cat.toLowerCase()));

    const riceItems = getItemsByCategory('rice');
    const gravyItems = getItemsByCategory('gravy');
    const breadItems = getItemsByCategory('bread');
    const starterItems = getItemsByCategory('starter');

    // Combo 1: Family Feast (Rice + Gravy + Bread)
    if (riceItems.length && gravyItems.length && breadItems.length) {
      const totalPrice = riceItems[0].price + gravyItems[0].price + breadItems[0].price;
      combos.push({
        id: 'combo_1',
        name: 'Family Feast Combo',
        description: `${riceItems[0].name} • ${gravyItems[0].name} • ${breadItems[0].name}`,
        price: Math.round(totalPrice * 0.8), // 20% off
        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
        isVeg: riceItems[0].isVeg === true && gravyItems[0].isVeg === true && breadItems[0].isVeg === true,
        category: 'Combos',
        rating: 4.6,
        ratingCount: 156
      });
    }

    // Combo 2: Quick Meal (Gravy + Bread)
    if (gravyItems.length > 1 && breadItems.length > 1) {
      const totalPrice = gravyItems[1].price + breadItems[1].price;
      combos.push({
        id: 'combo_2',
        name: 'Quick Meal Combo',
        description: `${gravyItems[1].name} • ${breadItems[1].name} • Raita`,
        price: Math.round(totalPrice * 0.85), // 15% off
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d',
        isVeg: gravyItems[1].isVeg === true && breadItems[1].isVeg === true,
        category: 'Combos',
        rating: 4.4,
        ratingCount: 98
      });
    }

    // Combo 3: Starter + Main (Starter + Rice + Gravy)
    if (starterItems.length && riceItems.length && gravyItems.length) {
      const totalPrice = starterItems[0].price + riceItems[0].price + gravyItems[0].price;
      combos.push({
        id: 'combo_3',
        name: 'Complete Meal Combo',
        description: `${starterItems[0].name} • ${riceItems[0].name} • ${gravyItems[0].name}`,
        price: Math.round(totalPrice * 0.75), // 25% off
        image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0',
        isVeg: starterItems[0].isVeg === true && riceItems[0].isVeg === true && gravyItems[0].isVeg === true,
        category: 'Combos',
        rating: 4.7,
        ratingCount: 234
      });
    }

    return combos.slice(0, 3); // Return max 3 combos
  };

  // Re-implementing generateSmartCombos properly to avoid breaking active code
  // usage: const combosTemp = generateSmartCombos(allItems);


  const handleBannerClick = (offer: any) => {
    // Clear search if any
    setSearchQuery("");

    // Allow a brief render cycle for sections to reappear
    setTimeout(() => {
      // Logic to scroll based on offer content
      const title = offer.title?.toLowerCase() || "";
      const subtitle = offer.subtitle?.toLowerCase() || "";

      if (title.includes("combo") || subtitle.includes("combo")) {
        const element = document.getElementById("smart-combos");
        if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (title.includes("chef") || subtitle.includes("chef") || title.includes("special")) {
        // Jump to Chef's Recommendations Section
        const element = document.getElementById("chef-recs");
        if (element) element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        // Default (Check Menu) -> Jump to First Category (skipping Chef/Bestsellers if needed)
        // We want the Start of the Menu list
        if (dynamicCategories.length > 0) {
          // Find first non-special category if possible, or just the first available one
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
              if (dynamicCategories.length > 0) {
                // Find first non-special category
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

            {/* 3. Smart Combos (AI Menu) - Kept separate as it's frontend generated and distinct style */}
            {!isLoading && (isVegMode ? combos.filter(c => c.isVeg === true) : combos).length > 0 && (
              <div id="smart-combos" className="px-3 scroll-mt-24">
                <MenuSection
                  title="🎁 Smart Combos"
                  subtitle="AI-curated combo deals - Save more!"
                  items={isVegMode ? combos.filter(c => c.isVeg === true) : combos}
                  type="combos"
                />
              </div>
            )}

            {/* 4. Categories (What's in your mind?) */}
            {!isLoading && (
              <div className="bg-transparent py-2">

                <CategoryScroll
                  categories={dynamicCategories.filter(category => {
                    const categoryItems = menuItems.filter(item => item.category === category.name);
                    return !isVegMode || categoryItems.some(item => item.isVeg === true);
                  })}
                  onSelect={handleCategorySelect}
                  selectedCategory={selectedCategory || undefined}
                />
              </div>
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

        {/* Chef's Recommendations (Standalone) */}
        {!isLoading && (isVegMode ? chefSpecials.filter(c => c.isVeg === true) : chefSpecials).length > 0 && !searchQuery && (
          <div id="chef-recs" className="px-3 scroll-mt-24">
            <MenuSection
              title="⭐ Chef's Recommendations"
              subtitle="Premium dishes handpicked for you"
              items={isVegMode ? chefSpecials.filter(c => c.isVeg === true) : chefSpecials}
              type="chef"
            />
          </div>
        )}

        {/* MAIN MENU SECTIONS (Dynamic Categories - Browse Mode) */}
        {!isLoading && !searchQuery && dynamicCategories.map((category) => {
          // Skip standalone sections to avoid duplication
          if (category.name === "Chef Special") return null;

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