import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/api";
import {
  ArrowLeft,
  Minus,
  Plus,
  Trash2,
  ChefHat,
  Receipt,
  CreditCard,
  Sparkles,
  Ticket,
  ChevronRight,
  Percent,
} from "lucide-react";

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, totalPrice, addItem } = useCart();
  const { tableNumber, user } = useUser();
  const [instructions, setInstructions] = useState("");

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [aiPitch, setAiPitch] = useState("");
  const [upsells, setUpsells] = useState<any>({});
  const [coupons, setCoupons] = useState<any[]>([]);
  const [aiCombos, setAiCombos] = useState<any[]>([]);
  const [showCoupons, setShowCoupons] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);

  useEffect(() => {
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      const fetchRecs = async () => {
        try {
          const res: any = await api.fetchRecommendations(user?.email || "", lastItem.id);
          if (res) {
            // Handle both potential response structures (legacy/new)
            const recs = res.add_ons || res.smart_recommendations?.add_ons || [];
            const pitch = res.ai_pitch || res.smart_recommendations?.ai_pitch || "";

            setRecommendations(recs);
            setAiPitch(pitch);
          }
        } catch (error) {
          console.error("Failed to load recommendations:", error);
        }
      };
      fetchRecs();

      api.fetchUpsellItems().then(res => {
        // Backend returns array directly or { upsells: [] }
        const items = Array.isArray(res) ? res : (res?.upsells || []);
        setUpsells(items);
      });
      api.fetchCoupons().then(res => res?.coupons && setCoupons(res.coupons));

      if (items.length >= 1) {
        api.generateCombos(2, user?.email || "test@user.com").then(res => {
          if (res?.combos) setAiCombos(res.combos);
        });
      }
    }
  }, [items.length, user?.email]);

  // Auto-Apply Coupon Logic
  useEffect(() => {
    if (coupons.length > 0 && !selectedCoupon) {
      let bestCoupon = null;
      let maxDiscount = 0;

      coupons.forEach(coupon => {
        const discount = getDiscountValue(coupon, totalPrice);
        if (discount > maxDiscount) {
          maxDiscount = discount;
          bestCoupon = coupon;
        }
      });

      if (bestCoupon) {
        setSelectedCoupon(bestCoupon);
      }
    }
  }, [coupons, totalPrice, selectedCoupon]);

  const handleAddRecommendation = (rec: any) => {
    addItem({
      id: rec.id || rec.Item_ID,
      name: rec.name || rec.Item_Name,
      price: rec.price || rec.Current_Price,
      image: rec.image || rec.Image_URL || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
      isVeg: rec.isVeg !== undefined ? rec.isVeg : Boolean(rec.Is_Veg),
      category: rec.category || rec.Category || "Add-ons",
      description: "Delicious add-on",
      rating: 4.5,
      ratingCount: 10
    });
  };

  const taxes = Math.round(totalPrice * 0.05);
  const grandTotal = totalPrice + taxes;

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
      state: { totalAmount: finalTotal, cartItems: items, tableNumber, instructions }
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl animate-pulse-soft">
          <img src="https://cdn-icons-png.flaticon.com/512/11329/11329060.png" alt="Empty Cart" className="w-24 h-24 opacity-80" />
        </div>
        <h3 className="text-2xl font-black text-gray-800 mb-2">Good food is waiting</h3>
        <p className="text-gray-500 mb-8 max-w-xs mx-auto">Your cart is empty. Add something delicious from the menu!</p>
        <Button onClick={() => navigate("/home")} className="bg-[#E23744] hover:bg-[#d12e3b] text-white px-8 py-6 rounded-xl text-lg font-bold shadow-lg shadow-red-200">
          Browse Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F2] pb-40">
      {/* Sticky Premium Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-4 px-4 py-3">
          <button onClick={() => navigate("/home")} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-lg font-black text-gray-900 leading-none">Your Cart</h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{items.length} items from <strong>DineIQ Premium</strong></p>
          </div>
          <div className="ml-auto bg-green-50 text-green-700 px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase border border-green-200">
            Dine In • T-{tableNumber || "1"}
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">

        {/* Cart Items List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
          {items.map((item) => (
            <div key={item.id} className="p-4 flex gap-4">
              {/* Image */}
              <div className="relative w-20 h-20 flex-shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                <div className={`absolute bottom-0 right-0 p-1 bg-white rounded-tl-lg shadow-sm border-t border-l border-gray-100`}>
                  <div className={`w-3 h-3 border-[2px] ${item.isVeg ? "border-green-600" : "border-red-500"} flex items-center justify-center p-[1px]`}>
                    <div className={`w-full h-full rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-500"}`} />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm leading-tight line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 font-medium">₹{item.price} x {item.quantity}</p>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="font-black text-gray-900">₹{item.price * item.quantity}</div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center bg-red-50 border border-red-100 rounded-lg h-8">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-full flex items-center justify-center text-[#E23744] hover:bg-red-100 rounded-l-lg transition-colors">
                      {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-sm font-bold text-[#E23744] w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-full flex items-center justify-center text-[#E23744] hover:bg-red-100 rounded-r-lg transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3 text-gray-700">
            <ChefHat className="w-4 h-4" />
            <h3 className="font-bold text-sm">Cooking Instructions</h3>
          </div>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Less spicy, no coriander, allergy info..."
            className="bg-gray-50 border-gray-100 focus:border-gray-200 focus:ring-0 rounded-xl text-sm min-h-[80px]"
          />
        </div>

        {/* Recommendations - "You might also like" */}
        {(recommendations.length > 0) && (
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <h3 className="font-bold text-gray-800 text-sm">
                {aiPitch || "Complete your meal"}
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex-shrink-0 w-44 bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col gap-2 group hover:shadow-md transition-shadow">
                  <div className="relative h-28 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={rec.Image_URL || "https://images.unsplash.com/photo-1544145945-f90425340c7e"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      alt={rec.Item_Name}
                    />

                    {/* Tag Badge (e.g. "Best with Curry") */}
                    {rec.tag && (
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                        {rec.tag}
                      </div>
                    )}

                    <button
                      onClick={() => handleAddRecommendation(rec)}
                      className="absolute bottom-2 right-2 bg-white text-green-600 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md uppercase border border-green-50 active:scale-95 transition-transform hover:bg-green-50"
                    >
                      Add
                    </button>
                  </div>
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">{rec.Item_Name}</p>
                      <div className={`w-2.5 h-2.5 border-[1px] flex-shrink-0 mt-0.5 ${rec.isVeg ? "border-green-600" : "border-red-500"} flex items-center justify-center p-[1px]`}>
                        <div className={`w-full h-full rounded-full ${rec.isVeg ? "bg-green-600" : "bg-red-500"}`} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-medium">₹{rec.Current_Price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upsells Section (Desserts/Beverages) */}
        {Array.isArray(upsells) && upsells.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Sparkles className="w-4 h-4 text-pink-500 fill-pink-100" />
              <h3 className="font-bold text-gray-800 text-sm">You may also like</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
              {upsells.map((item: any, i: number) => (
                <div key={i} className="flex-shrink-0 w-40 bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col gap-2">
                  <div className="relative h-24 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src="https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200&h=200&fit=crop"
                      className="w-full h-full object-cover"
                      alt={item.name}
                    />
                    <button
                      onClick={() => handleAddRecommendation(item)}
                      className="absolute bottom-2 right-2 bg-white text-green-600 text-xs font-bold px-3 py-1 rounded-lg shadow-sm border border-green-50"
                    >
                      ADD
                    </button>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 line-clamp-1">{item.name}</p>
                    <p className="text-xs text-gray-500">₹{item.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Combos Horizontal Scroll */}
        {aiCombos.length > 0 && (
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4 snap-x">
            {aiCombos.map((combo) => (
              <div key={combo.Item_ID} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex-shrink-0 w-64 snap-center">
                <img src={combo.Image_URL} className="w-full h-32 object-cover rounded-lg mb-2" />
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{combo.Item_Name}</h4>
                    <p className="text-xs text-gray-500">₹{combo.Current_Price}</p>
                  </div>
                  <button onClick={() => handleAddRecommendation(combo)} className="bg-red-50 text-[#E23744] text-xs font-bold px-3 py-1 rounded uppercase border border-red-100">ADD</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Coupon Section - RESTORED & IMPROVED */}
        <div
          onClick={() => setShowCoupons(!showCoupons)}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 shadow-sm border border-blue-100 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-full shadow-sm text-blue-600">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Use Coupons</h3>
              <p className="text-xs text-gray-500 font-medium">
                {selectedCoupon
                  ? <span className="text-green-600">Applied: {selectedCoupon.code}</span>
                  : "Deals & Offers available"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-blue-600">
            <span className="text-xs font-bold uppercase tracking-wide">
              {selectedCoupon ? "Change" : "Apply"}
            </span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Bill Details */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3 mt-4">
          <h3 className="font-black text-sm text-gray-900 uppercase tracking-widest mb-4">Bill Summary</h3>

          <div className="flex justify-between text-sm text-gray-600">
            <span>Item Total</span>
            <span>₹{totalPrice}</span>
          </div>

          <div className="flex justify-between text-sm text-gray-600">
            <span>Taxes & Charges (5%)</span>
            <span>₹{taxes}</span>
          </div>

          {selectedCoupon && (
            <div className="flex justify-between text-sm text-green-600 font-medium">
              <span>Coupon Discount</span>
              <span>- ₹{discountValue}</span>
            </div>
          )}

          <div className="border-t border-dashed border-gray-200 my-2" />

          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900">Grand Total</span>
            <span className="font-black text-xl text-gray-900">₹{finalTotal}</span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Pay Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-6 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-50">
        <Button
          onClick={handleProceedToPayment}
          className="w-full bg-[#E23744] hover:bg-[#c9212e] text-white h-14 rounded-xl font-bold text-lg shadow-lg flex items-center justify-between px-6"
        >
          <div className="flex flex-col items-start leading-none">
            <span className="text-sm font-medium opacity-80">Total to Pay</span>
            <span>₹{finalTotal}</span>
          </div>
          <div className="flex items-center gap-2">
            Proceed <CreditCard className="w-5 h-5" />
          </div>
        </Button>
      </div>

      {/* Coupons Sheet (Simple overlay for now) */}
      {showCoupons && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-[70vh] rounded-t-3xl sm:rounded-3xl p-6 overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-900">Available Coupons</h2>
              <button onClick={() => setShowCoupons(false)} className="p-2 bg-gray-100 rounded-full">✕</button>
            </div>
            <div className="space-y-4">
              {coupons.map((coupon) => (
                <div key={coupon.id} onClick={() => { setSelectedCoupon(coupon); setShowCoupons(false); }} className="border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-[#E23744] transition-colors relative overflow-hidden group">
                  <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                    {coupon.code}
                  </div>
                  <h3 className="font-bold text-gray-800">{coupon.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{coupon.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}