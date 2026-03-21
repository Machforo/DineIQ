import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { offlineApi as api } from "@/utils/offlineApi"; // Import API
import {
  ArrowLeft,
  Minus,
  Plus,
  Trash2,
  ChefHat,
  Receipt,
  CreditCard,
  Sparkles,
  PlusCircle,
  Gift,
  Ticket,
  Star,
  ChevronRight,
  Percent
} from "lucide-react";
import { saveLog } from "@/utils/logger";
import { getMenuItemImage } from "@/lib/categoryUtils";
// Flag for AI vs Smart Combos
const GENERATE_AI_COMBOS = true;

const PageStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
    .cart-page-wrapper { font-family: 'DM Sans', sans-serif !important; }
    .cart-page-wrapper * { font-family: 'DM Sans', sans-serif !important; }
  `}</style>
);

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, totalPrice, addItem } = useCart();
  const { tableNumber, user } = useUser();
  const [instructions, setInstructions] = useState("");

  // Recommendations State
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [aiPitch, setAiPitch] = useState("");
  const [nudge, setNudge] = useState<any>(null);
  const [upsells, setUpsells] = useState<any>({});
  const [coupons, setCoupons] = useState<any[]>([]);
  const [aiCombos, setAiCombos] = useState<any[]>([]);
  const [showCoupons, setShowCoupons] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);

  // Fetch Recommendations & Nudge when cart changes
  useEffect(() => {
    if (items.length > 0) {
      // 1. Recommendations based on last item
      const lastItem = items[items.length - 1];

      const fetchRecs = async () => {
        // 1. Fetch recommended items first (fast)
        const res = await api.fetchRecommendations(user?.email || "", lastItem.id, true);
        if (res) {
          const adds = res.smart_recommendations?.add_ons || res.add_ons || [];
          setRecommendations(adds);

          // 2. Fetch AI Pitch in background (slow)
          const itemName = res.item_name || lastItem.name;
          const category = res.category || lastItem.category;
          if (adds.length > 0) {
            api.fetchAiPitch(itemName, category, adds).then(pitchRes => {
              if (pitchRes?.ai_pitch) setAiPitch(pitchRes.ai_pitch);
            });
          }
        }
      };

      // 2. Pricing Nudge based on total
      const fetchPricing = async () => {
        // Construct minimal cart for pricing agent
        const simpleCart = items.map(i => ({
          Item_ID: i.id,
          Current_Price: i.price,
          quantity: i.quantity,
          category: i.category
        }));
        const res = await api.getPricingStrategy(user?.email || "", simpleCart);
        if (res && res.pricing && res.pricing.upsell_nudge) {
          setNudge(res.pricing.upsell_nudge);
        }
      };

      fetchRecs();
      fetchPricing();

      // 3. Fetch Upsells & Coupons
      api.fetchUpsellItems().then(res => {
        // Backend returns either { upsells: [] } or just []
        const upArr = res?.upsells || (Array.isArray(res) ? res : []);
        setUpsells(upArr);
      });

      api.fetchCoupons().then(res => {
        if (res?.coupons) setCoupons(res.coupons);
      });

      // 4. Generate AI Combos (Only if flag is enabled)
      if (GENERATE_AI_COMBOS && items.length >= 1) {
        // Pass user email for personalization
        const email = user?.email || "test@user.com";
        api.generateCombos(2, email).then(res => {
          if (res?.combos) setAiCombos(res.combos);
        });
      }
    } else {
      setRecommendations([]);
      setNudge(null);
    }
  }, [items.length, totalPrice, user?.email]); // Re-run when item count or total changes

  // Auto-Apply Coupon Logic (Adapted from Sana_DineIQ)
  useEffect(() => {
    if (coupons.length > 0 && !selectedCoupon) {
      let bestCoupon = null;
      let maxDiscount = 0;

      coupons.forEach(coupon => {
        if ((coupon.minOrderValue || 0) <= totalPrice) {
          let discount = 0;
          if (coupon.type === 'flat') {
            discount = coupon.discountAmount || 0;
          } else if (coupon.type === 'percent' || coupon.type === 'tiered') {
            discount = Math.round(totalPrice * ((coupon.discountPercent || 0) / 100));
          }
          if (discount > maxDiscount) {
            maxDiscount = discount;
            bestCoupon = coupon;
          }
        }
      });

      if (bestCoupon) {
        setSelectedCoupon(bestCoupon);
      }
    }
  }, [coupons, totalPrice, selectedCoupon]);

  useEffect(() => {
    if (selectedCoupon && totalPrice < (selectedCoupon.minOrderValue || 0)) {
      setSelectedCoupon(null);
    }
    if (selectedCoupon) {
      saveLog(user?.email || "Guest", "COUPON_APPLIED", `Coupon: ${selectedCoupon.code}`);
    }
  }, [totalPrice, selectedCoupon, user?.email]);

  const handleAddRecommendation = (rec: any) => {
    // Log before adding
    saveLog(user?.email || "Guest", "REC_OPTED", `Item: ${rec.Item_Name} (Price: ${rec.Current_Price})`);

    // Add to cart logic
    addItem({
      id: rec.Item_ID,
      name: rec.Item_Name,
      price: rec.Current_Price,
      image: rec.Image_URL || "https://images.unsplash.com/photo-1544145945-f90425340c7e", // Use image from rec if available
      isVeg: rec.Is_Veg !== undefined ? rec.Is_Veg : true,
      category: rec.Category || "Add-ons",
      description: rec.Item_Description || "Delicious add-on",
      rating: 4.5,
      ratingCount: 10
    }, true);
  };

  const taxes = Math.round(totalPrice * 0.05);
  const deliveryFee = 0;
  const grandTotal = totalPrice + taxes + deliveryFee;

  const getDiscountValue = (coupon: any, price: number) => {
    if (!coupon) return 0;
    if (coupon.type === 'flat') return coupon.discountAmount || 0;
    if (coupon.type === 'percent' || coupon.type === 'tiered')
      return Math.round(price * ((coupon.discountPercent || 0) / 100));
    return 0;
  };

  const discountValue = selectedCoupon ? getDiscountValue(selectedCoupon, totalPrice) : 0;
  const finalTotal = Math.max(0, grandTotal - discountValue);

  const handleProceedToPayment = () => {
    navigate("/payment", {
      state: {
        totalAmount: finalTotal,
        cartItems: items,
        tableNumber: tableNumber,
        instructions: instructions
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8F8F8] flex flex-col cart-page-wrapper">
        <PageStyle />
        <header className="sticky top-0 z-30 border-b border-white/10"
          style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2C1A0E 100%)', padding: '48px 16px 18px' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/home")}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-lg font-extrabold text-white tracking-tight">Your Cart</h1>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
            <span className="text-5xl">🛒</span>
          </div>
          <h3 className="text-xl font-bold text-foreground">Your cart is empty</h3>
          <p className="text-muted-foreground text-center mt-2">
            Add delicious items from our menu to get started
          </p>
          <Button
            onClick={() => navigate("/home")}
            className="mt-6 gradient-primary text-primary-foreground px-8"
          >
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-36 cart-page-wrapper">
      <PageStyle />
      {/* Header aligned with Sana V2 */}
      <header className="sticky top-0 z-30 border-b border-white/10"
        style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2C1A0E 100%)', padding: '48px 16px 18px' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/home")}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-white leading-tight">Your Cart</h1>
            <p className="text-[11px] text-white/50 mt-0.5">
              {items.length} items · Table {tableNumber}
            </p>
          </div>
          <div className="ml-auto px-3 py-1 rounded-full border border-red-500/40"
            style={{ background: 'rgba(226,55,68,0.22)' }}>
            <span className="text-xs font-bold text-[#FF8B94]">
              KSh {totalPrice.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      {/* Cart Items */}
      <div className="px-4 py-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white p-4 flex gap-4 transition-all duration-300"
            style={{ borderRadius: '24px', border: '1px solid #F0F0F0', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}
          >
            {/* Image */}
            <div className="w-20 h-20 rounded-[14px] overflow-hidden flex-shrink-0">
              <img
                src={getMenuItemImage(item)}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div style={{
                      width: 13, height: 13, borderRadius: 3, flexShrink: 0,
                      border: `2.5px solid ${item.isVeg ? '#1BA672' : '#C8102E'}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: item.isVeg ? '#1BA672' : '#C8102E',
                      }} />
                    </div>
                    <h3 className="text-[14px] font-extrabold text-[#1C1C1C] truncate">{item.name}</h3>
                  </div>
                  <p className="text-[15px] font-black text-[#E23744]">
                    KSh {(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="w-7 h-7 rounded-lg bg-[#F7F7F7] flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-[#9E9E9E]" />
                </button>
              </div>

              {/* Quantity Controls - Red Theme */}
              <div className="flex items-center justify-end mt-2">
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl shadow-[0_4px_12px_rgba(226,55,68,0.25)]"
                  style={{ background: '#E23744' }}>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-white transition-all active:bg-white/30"
                    style={{ background: 'rgba(255,255,255,0.22)' }}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-[13px] font-black text-white min-w-[20px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-white transition-all active:bg-white/30"
                    style={{ background: 'rgba(255,255,255,0.22)' }}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- RECOMENDATIONS SECTION (Zomato Style) --- */}

      {/* --- PRICING NUDGE (NEW) --- */}
      {nudge && (
        <div className="px-4 py-2">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 shadow-sm flex items-center gap-3 animate-fade-in">
            <div className="bg-white p-2 rounded-full shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-800 leading-tight">
                {nudge.message || "Add more items to get a special discount!"}
              </p>
              {nudge.show && nudge.progress_percentage !== undefined && (
                <div className="mt-2 h-2 w-full bg-amber-100/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 rounded-full"
                    style={{ width: `${nudge.progress_percentage}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* --- ADD MORE ITEMS (Upsells & Recommendations) --- */}
      <div className="py-2 space-y-4">

        {/* 1. Pairs well (Specific Recs) */}
        {(() => {
          const displayedIds = new Set();
          const uniqueRecs = recommendations.filter(rec => {
            if (displayedIds.has(rec.Item_ID)) return false;
            displayedIds.add(rec.Item_ID);
            return true;
          });

          if (uniqueRecs.length === 0) return null;

          return (
            <div className="pl-4">
              <div className="flex items-center gap-1.5 mb-2">
                <p className="text-[13px] font-extrabold text-[#1C1C1C]">🍽️ Pairs well with your order</p>
              </div>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 pr-4 snap-x snap-mandatory">
                {uniqueRecs.map((rec) => (
                  <div key={rec.Item_ID} className="flex-shrink-0 w-40 bg-white overflow-hidden snap-start transition-transform active:scale-95"
                    style={{ borderRadius: '24px', border: '1px solid #F0F0F0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                    <div className="relative h-24">
                      <img src={getMenuItemImage(rec) || "https://images.unsplash.com/photo-1546833999-b9f581a1996d"} className="w-full h-full object-cover" />
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                        style={{ background: rec.Is_Veg ? '#EBF9F4' : '#FFF0F0', color: rec.Is_Veg ? '#1BA672' : '#E23744' }}>
                        {rec.Is_Veg ? "VEG" : "NON"}
                      </div>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[12px] font-bold text-[#1C1C1C] line-clamp-1 mb-1">{rec.Item_Name}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-black text-[#1C1C1C]">KSh {rec.Current_Price}</span>
                        <button
                          onClick={() => handleAddRecommendation(rec)}
                          className="bg-[#E23744] text-white px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tight"
                        >
                          ADD
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 2. Sweet Cravings (Upsells) */}
        {(() => {
          // Flatten and deduplicate across all upsell categories
          const allUpsells: any[] = [];
          const seenIds = new Set(recommendations.map(r => r.Item_ID)); // Don't repeat what's in "Pairs well"

          if (Array.isArray(upsells)) {
            upsells.forEach(item => {
              if (!seenIds.has(item.Item_ID)) {
                allUpsells.push(item);
                seenIds.add(item.Item_ID);
              }
            });
          }

          if (allUpsells.length === 0) return null;

          // Group back if we want to keep categories, or just show a curated list
          // For now, let's just show them uniquely
          return (
            <div className="pl-4">
              <div className="flex items-center gap-1.5 mb-2">
                <p className="text-[13px] font-extrabold text-[#1C1C1C]">✨ You may also like</p>
              </div>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 pr-4 snap-x snap-mandatory">
                {allUpsells.map((rec) => (
                  <div key={rec.Item_ID} className="flex-shrink-0 w-40 bg-white overflow-hidden snap-start transition-transform active:scale-95"
                    style={{ borderRadius: '24px', border: '1px solid #F0F0F0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)' }}>
                    <div className="relative h-24">
                      <img src={getMenuItemImage(rec)} className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleAddRecommendation(rec)}
                        className="absolute -bottom-3 right-2 bg-white shadow-md text-[#E23744] font-black px-3 py-1 rounded-lg text-[10px] border border-red-50/50 uppercase">
                        ADD
                      </button>
                    </div>
                    <div className="p-2.5 mt-3">
                      <p className="text-[12px] font-bold text-[#1C1C1C] line-clamp-1 mb-0.5">{rec.Item_Name}</p>
                      <p className="text-[12px] font-black text-[#1C1C1C]">KSh {rec.Current_Price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>



      {/* --- COUPONS & OFFERS --- */}
      <div className="px-4 py-3">
        <div
          onClick={() => setShowCoupons(!showCoupons)}
          className="bg-white p-3.5 flex items-center justify-between cursor-pointer active:shadow-md transition-all"
          style={{
            borderRadius: '16px',
            border: selectedCoupon ? '1.5px solid #1BA672' : '1.5px dashed #EFEFEF',
            backgroundColor: selectedCoupon ? '#EBF9F4' : '#FFFFFF'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: selectedCoupon ? '#EBF9F4' : '#FFF1F2' }}>
              <Percent style={{ width: 16, height: 16, color: selectedCoupon ? '#1BA672' : '#E23744' }} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#1C1C1C]">
                {selectedCoupon ? `✅ ${selectedCoupon.code} Applied` : "Use Coupons"}
              </p>
              <p className="text-[11px] text-[#9E9E9E] font-medium">
                {selectedCoupon ? `Saving KSh ${discountValue}` : "Deals & Offers available"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[#E23744]">
            {selectedCoupon ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCoupon(null);
                }}
                className="text-[11px] font-bold uppercase"
              >
                Remove
              </button>
            ) : (
              <>
                <span className="text-xs font-bold uppercase tracking-wide text-[#9E9E9E]">
                  Apply
                </span>
                <ChevronRight className="w-4 h-4 text-[#9E9E9E]" />
              </>
            )}
          </div>
        </div>

        {/* Coupon Nudge Progress */}
        {!selectedCoupon && coupons.length > 0 && (() => {
          const nextTier = coupons.find(c => c.type === 'tiered' && (c.minOrderValue || 0) > totalPrice);
          if (nextTier) {
            const diff = (nextTier.minOrderValue || 0) - totalPrice;
            const progress = Math.min(100, (totalPrice / (nextTier.minOrderValue || 0)) * 100);
            return (
              <div className="mt-3 px-1 animate-fade-in">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">Add <b>KSh {diff}</b> for <b>{nextTier.discountPercent}% OFF</b></span>
                  <span className="text-gray-400">{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )
          }
          return null;
        })()}

        {showCoupons && (
          <div className="mt-4 space-y-4 animate-fade-in pl-1">

            {/* 1. Campaign Offers (Horizontal Scroll) */}
            <div>
              <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Best Offers</h5>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {coupons.filter(c => c.type === 'campaign').map((offer) => (
                  <div
                    key={offer.id}
                    onClick={() => {
                      setSelectedCoupon(offer);
                      setShowCoupons(false);
                    }}
                    className={`relative flex-shrink-0 w-64 h-32 rounded-xl overflow-hidden cursor-pointer active:scale-95 transition-transform border ${selectedCoupon?.id === offer.id ? 'ring-2 ring-primary' : 'border-transparent'}`}
                  >
                    <img src={offer.image} className="absolute inset-0 w-full h-full object-cover" />
                    <div className={`absolute inset-0 bg-gradient-to-r ${offer.bgColor === 'gradient-gold' ? 'from-yellow-500/80' : 'from-black/70'} to-transparent p-4 flex flex-col justify-center text-white`}>
                      <span className="text-[10px] font-bold uppercase opacity-90">{offer.subtitle}</span>
                      <h3 className="text-2xl font-black leading-none">{offer.title}</h3>
                      <button className="mt-2 text-[10px] bg-white/20 backdrop-blur-md px-3 py-1 rounded-full self-start font-bold">
                        APPLY
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Tiered Offers (List) */}
            <div>
              <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Milestone Rewards</h5>
              <div className="space-y-2">
                {coupons.filter(c => c.type === 'tiered').map((coupon, idx) => {
                  const isLocked = totalPrice < (coupon.minOrderValue || 0);
                  return (
                    <div key={idx} className={`border rounded-lg p-3 flex justify-between items-center shadow-sm relative overflow-hidden transition-all ${isLocked ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-white border-blue-100'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm px-2 py-0.5 rounded ${isLocked ? 'bg-gray-200 text-gray-500' : 'bg-purple-100 text-purple-700'}`}>
                            {coupon.code}
                          </span>
                          {isLocked && <span className="text-[10px] text-red-500 font-bold">Locked</span>}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{coupon.title} • {coupon.subtitle}</p>
                      </div>

                      {isLocked ? (
                        <span className="text-[10px] text-gray-400 font-medium">Add KSh {(coupon.minOrderValue || 0) - totalPrice}</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCoupon(coupon);
                            setShowCoupons(false);
                          }}
                          className={`${selectedCoupon?.id === coupon.id ? 'bg-green-100 text-green-700' : 'text-blue-600'} font-bold text-xs hover:bg-blue-50`}
                        >
                          {selectedCoupon?.id === coupon.id ? 'APPLIED' : 'APPLY'}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* --- AI COMBOS (Moved Here) --- */}
      {/* AI Smart Combos - Only if enabled */}
      {GENERATE_AI_COMBOS && aiCombos.length > 0 && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-600 fill-purple-100" />
            <h3 className="font-bold text-gray-800 text-sm">
              Smart Deals For You
            </h3>
          </div>

          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4 snap-x">
            {aiCombos.map((combo) => (
              <div key={combo.Item_ID} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex-shrink-0 w-64 snap-center">
                <img src={getMenuItemImage(combo)} className="w-full h-32 object-cover rounded-lg mb-2" />
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{combo.Item_Name}</h4>
                    <p className="text-xs text-gray-500">KSh {combo.Current_Price}</p>
                  </div>
                  <button onClick={() => handleAddRecommendation(combo)} className="bg-primary/5 text-primary text-xs font-bold px-3 py-1 rounded uppercase border border-primary/20 hover:bg-primary/10 transition-colors">ADD</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cooking Instructions */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-[20px] overflow-hidden shadow-sm border border-[#EFEFEF]">
          <div className="flex items-center gap-2 p-4 border-b border-[#F7F7F7]"
            style={{ background: 'rgba(245,158,11,0.08)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <ChefHat className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <h3 className="font-bold text-[#1C1C1C] text-sm">Cooking Instructions</h3>
          </div>
          <div className="p-4">
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Less spicy, No onions, Extra sauce..."
              className="bg-[#F8F8F8] border-[#EFEFEF] rounded-xl resize-none text-sm p-3 placeholder:text-[#9E9E9E]"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Bill Details */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-[20px] overflow-hidden shadow-sm border border-[#EFEFEF]">
          <div className="flex items-center gap-2 p-4 border-b border-gray-50"
            style={{ background: 'linear-gradient(135deg, #1A1A1A, #2C1A0E)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(226,55,68,0.2)', border: '1px solid rgba(226,55,68,0.3)' }}>
              <Receipt className="w-4 h-4 text-[#FF8B94]" />
            </div>
            <h3 className="font-bold text-white text-sm">Bill Details</h3>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item Total</span>
              <span className="font-bold text-gray-800">KSh {totalPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST & Taxes (5%)</span>
              <span className="font-bold text-gray-800">KSh {taxes.toLocaleString()}</span>
            </div>
            {selectedCoupon && (
              <div className="flex justify-between animate-fade-in text-green-600">
                <span className="font-semibold">Coupon ({selectedCoupon.code})</span>
                <span className="font-black">-KSh {discountValue.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span className="font-bold text-green-600">FREE</span>
            </div>
            <div className="mt-4 p-4 -mx-4 -mb-4 flex justify-between items-center"
              style={{ background: 'linear-gradient(135deg, #1A1A1A, #2C1A0E)' }}>
              <span className="font-extrabold text-white text-base">Grand Total</span>
              <div className="text-right">
                {selectedCoupon && <p className="text-[10px] text-white/40 line-through">KSh {grandTotal.toLocaleString()}</p>}
                <p className="font-black text-xl text-[#FF8B94]">KSh {finalTotal.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EFEFEF] p-4 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] z-50">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <p className="text-[11px] text-[#9E9E9E] font-black uppercase tracking-widest">Total Amount</p>
            <p className="text-[28px] font-black text-[#1C1C1C] leading-none">KSh {finalTotal.toLocaleString()}</p>
          </div>
          <p className="text-[11px] text-[#9E9E9E] font-bold">
            Delivery to Table #{tableNumber}
          </p>
        </div>

        <Button
          onClick={handleProceedToPayment}
          className="w-full h-14 text-sm font-black text-white rounded-[16px] shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #E23744 0%, #C0303C 100%)', boxShadow: '0 8px 24px rgba(226,55,68,0.35)' }}
        >
          <CreditCard className="w-5 h-5" />
          Proceed to Payment
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div >
  );
}