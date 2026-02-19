import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/api"; // Import API
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
  Star
} from "lucide-react";
import { saveLog } from "@/utils/logger";

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
        const res = await api.fetchRecommendations(user?.email || "", lastItem.id);
        if (res && res.smart_recommendations) {
          setRecommendations(res.smart_recommendations.add_ons || []);
          setAiPitch(res.smart_recommendations.ai_pitch || "Pairs well with your order!");
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
        if (res?.upsells) setUpsells(res.upsells);
      });

      api.fetchCoupons().then(res => {
        if (res?.coupons) setCoupons(res.coupons);
      });

      // 4. Generate AI Combos (Always fetch for visibility)
      if (items.length >= 1) {
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
  }, [items.length, user?.email]); // Re-run when item count changes
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
    if (coupon.type === 'percent') return Math.round(price * ((coupon.discountPercent || 0) / 100));
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
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-card sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4 px-4 py-4">
            <button
              onClick={() => navigate("/home")}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Your Cart</h1>
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
    <div className="min-h-screen bg-background pb-36">
      {/* Header */}
      <header className="bg-card sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4 px-4 py-4">
          <button
            onClick={() => navigate("/home")}
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Your Cart</h1>
          <span className="ml-auto text-sm text-muted-foreground">
            {items.length} items
          </span>
        </div>
      </header>

      {/* Cart Items */}
      <div className="px-4 py-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-card rounded-2xl p-4 shadow-sm flex gap-4"
          >
            {/* Image */}
            <img
              src={item.image}
              alt={item.name}
              className="w-20 h-20 rounded-xl object-cover"
            />

            {/* Details */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={item.isVeg ? "badge-veg" : "badge-nonveg"} />
                    <h3 className="font-semibold text-foreground">{item.name}</h3>
                  </div>
                  <p className="text-lg font-bold text-foreground mt-1">
                    KSh {item.price * item.quantity}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center justify-end mt-2">
                <div className="flex items-center gap-3 bg-secondary rounded-xl px-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center text-primary"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-foreground w-6 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center text-primary"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- RECOMENDATIONS SECTION (Zomato Style) --- */}

      {/* --- PRICING NUDGE (NEW) --- */}
      {/* We need state for nudge, fetched via useEffect on [items] */}
      {/* Since I can't add state easily with replace_file_content without rewriting the whole component top, 
          I will assume the user accepts a slightly larger edit or I should have done multi_replace. 
          Actually, I need to add state and useEffect for `nudge`.
          Let's verify lines 16-43 to see where to inject `nudge` state.
      */}
      {/* --- ADD MORE ITEMS (Upsells & Recommendations) --- */}
      <div className="py-2 space-y-4">

        {/* 1. Pairs well (Specific Recs) */}
        {recommendations.length > 0 && (
          <div className="pl-4 animate-fade-in">
            <h3 className="font-bold text-gray-800 text-sm mb-2">Pairs well with your order</h3>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 pr-4">
              {recommendations.map((rec) => (
                <div key={rec.Item_ID} className="flex-shrink-0 w-36 bg-white rounded-lg p-2 border border-gray-100 shadow-sm">
                  <div className="relative mb-2">
                    <img src={rec.Image_URL || "https://images.unsplash.com/photo-1546833999-b9f581a1996d"} className="w-full h-24 object-cover rounded-md" />
                    <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${rec.Is_Veg ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {rec.Is_Veg ? "VEG" : "NON"}
                    </div>
                    <button
                      onClick={() => handleAddRecommendation(rec)}
                      className="absolute -bottom-3 right-2 bg-white shadow-md text-green-600 font-bold px-3 py-1 rounded-md text-xs border border-green-100 uppercase">
                      ADD
                    </button>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-gray-500">KSh {rec.Current_Price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Sweet Cravings (Upsells) */}
        {Object.entries(upsells).map(([category, uItems]: [string, any[]]) => (
          <div key={category} className="pl-4 animate-fade-in">
            <h3 className="font-bold text-gray-800 text-sm mb-2">{category} Cravings?</h3>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 pr-4">
              {uItems.map((rec) => (
                <div key={rec.Item_ID} className="flex-shrink-0 w-36 bg-white rounded-lg p-2 border border-gray-100 shadow-sm">
                  <div className="relative mb-2">
                    <img src={rec.Image_URL} className="w-full h-24 object-cover rounded-md" />
                    <button
                      onClick={() => handleAddRecommendation(rec)}
                      className="absolute -bottom-3 right-2 bg-white shadow-md text-green-600 font-bold px-3 py-1 rounded-md text-xs border border-green-100 uppercase">
                      ADD
                    </button>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-gray-500">KSh {rec.Current_Price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>



      {/* --- COUPONS & OFFERS --- */}
      <div className="px-4 py-3 bg-gray-50/50">
        <div
          onClick={() => setShowCoupons(!showCoupons)}
          className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-3 flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${selectedCoupon ? 'bg-green-50' : 'bg-blue-50'}`}>
              <Ticket className={`w-5 h-5 ${selectedCoupon ? 'text-green-600' : 'text-blue-600'}`} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">
                {selectedCoupon ? `Coupon Applied: ${selectedCoupon.code}` : "Apply Coupon"}
              </h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                {selectedCoupon ? selectedCoupon.title : "Save more on this order"}
              </p>
            </div>
          </div>
          {selectedCoupon ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCoupon(null);
              }}
              className="text-red-500 font-bold text-xs uppercase hover:bg-red-50 px-2 py-1 rounded"
            >
              Remove
            </button>
          ) : (
            <span className="text-blue-600 font-bold text-xs uppercase">Select</span>
          )}
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
      {/* AI Smart Combos */}
      {aiCombos.length > 0 && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600 fill-purple-100" />
            <h3 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
              Smart Deals For You
            </h3>
          </div>

          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4 snap-x">
            {aiCombos.map((combo) => {
              // Calculate quantity from cart items
              const cartItem = items.find(i => i.id === combo.Item_ID);
              const quantity = cartItem ? cartItem.quantity : 0;

              // Calculate specific 3% logic for display if applicable
              const isCustomized = combo.Discount_Percent === 3 || combo.Discount_Percent === 4;

              return (
                <div key={combo.Item_ID} className="bg-card rounded-2xl p-4 shadow-sm border border-border flex-shrink-0 w-72 snap-center overflow-hidden">
                  {/* Image */}
                  <div className="relative h-36 -mx-4 -mt-4 mb-3">
                    <img
                      src={combo.Image_URL}
                      alt={combo.Item_Name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                    {/* Savings badge - Update to customized text if needed */}
                    {combo.Savings > 0 && (
                      <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-lg shadow-md">
                        {isCustomized ? 'Custom 3% OFF' : `Save KSh ${combo.Savings}`}
                      </div>
                    )}
                    {/* AI badge */}
                    {(combo.Is_Personalized || combo.Insight) && (
                      <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm text-foreground text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                        <Sparkles className="w-3 h-3 text-purple-500" />
                        {combo.Insight || "AI Pick"}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex items-start gap-2 mb-2">
                    <div className={`w-3 h-3 border rounded-sm flex items-center justify-center flex-shrink-0 mt-1 ${combo.Is_Veg ? 'border-green-600' : 'border-red-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${combo.Is_Veg ? 'bg-green-600' : 'bg-red-500'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-base leading-tight">{combo.Item_Name}</h3>
                      {isCustomized && (
                        <p className="text-[10px] text-purple-600 font-medium">✨ Personalized for you</p>
                      )}
                    </div>
                  </div>

                  {/* Combo items (Description) */}
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 font-medium">
                    {combo.Combo_Items ? combo.Combo_Items.join(" • ") : combo.Item_Description}
                  </p>

                  {/* Pricing Calculation Display */}
                  <div className="flex items-center justify-between mt-auto">
                    <div>
                      {isCustomized ? (
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-500">
                            KSh {combo.Original_Price} - 3%
                          </span>
                          <span className="text-lg font-bold text-foreground">
                            KSh {combo.Current_Price}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-400 line-through">KSh {combo.Original_Price}</span>
                          <span className="text-lg font-bold text-foreground">KSh {combo.Current_Price}</span>
                        </div>
                      )}
                    </div>

                    {quantity === 0 ? (
                      <button
                        onClick={() => handleAddRecommendation(combo)}
                        className="bg-card border-2 border-primary text-primary font-bold px-5 py-1.5 rounded-lg shadow-sm hover:bg-primary hover:text-primary-foreground transition-all text-sm"
                      >
                        ADD
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-primary rounded-lg shadow-md overflow-hidden">
                        <button
                          onClick={() => updateQuantity(combo.Item_ID, quantity - 1)}
                          className="p-2 text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-primary-foreground font-bold min-w-[24px] text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(combo.Item_ID, quantity + 1)}
                          className="p-2 text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cooking Instructions */}
      <div className="px-4 py-4">
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ChefHat className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Cooking Instructions</h3>
          </div>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g., Less spicy, No onions, Extra sauce..."
            className="bg-secondary border-0 rounded-xl resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* Bill Details */}
      <div className="px-4 py-4">
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Bill Details</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item Total</span>
              <span className="font-medium text-foreground">KSh {totalPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST & Taxes (5%)</span>
              <span className="font-medium text-foreground">KSh {taxes}</span>
            </div>
            {selectedCoupon && (
              <div className="flex justify-between animate-fade-in text-green-600">
                <span className="font-medium">Coupon ({selectedCoupon.code})</span>
                <span className="font-bold">-KSh {discountValue}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span className="font-medium text-green-600">FREE</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="font-bold text-lg text-foreground">Grand Total</span>
              <div className="text-right">
                {selectedCoupon && <span className="text-xs text-gray-400 line-through mr-2">KSh {grandTotal}</span>}
                <span className="font-bold text-xl text-primary">KSh {finalTotal}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-foreground">KSh {grandTotal}</p>
          </div>
          <p className="text-xs text-muted-foreground text-right">
            Delivery to Table #{tableNumber}
          </p>
        </div>

        <Button
          onClick={handleProceedToPayment}
          className="w-full h-14 text-lg font-bold rounded-xl gradient-primary text-primary-foreground shadow-lg flex items-center justify-center gap-2"
        >
          <CreditCard className="w-5 h-5" />
          Proceed to Payment
        </Button>
      </div>
    </div >
  );
}