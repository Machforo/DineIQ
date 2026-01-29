import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Minus,
  Plus,
  Trash2,
  ChefHat,
  Receipt,
  CreditCard, // Icon change kiya hai
} from "lucide-react";

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, totalPrice } = useCart();
  const { roomNumber } = useUser();
  const [instructions, setInstructions] = useState("");

  // Calculation wahi purani
  const taxes = Math.round(totalPrice * 0.05);
  const deliveryFee = 0;
  const grandTotal = totalPrice + taxes + deliveryFee;

  // ---> YAHAN CHANGE KIYA HAI <---
  // Ab ye function order place nahi karega, bas Payment page par bhejega
  const handleProceedToPayment = () => {
    navigate("/payment", { 
      state: { 
        totalAmount: grandTotal,
        cartItems: items,
        roomNumber: roomNumber,
        instructions: instructions // Cooking instructions bhi saath bhej rahe hain
      } 
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-card sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4 px-4 py-4">
            <button
              onClick={() => navigate(-1)}
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
            onClick={() => navigate(-1)}
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
                    ₹{item.price * item.quantity}
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
              <span className="font-medium text-foreground">₹{totalPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST & Taxes (5%)</span>
              <span className="font-medium text-foreground">₹{taxes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span className="font-medium text-veg">FREE</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="font-bold text-foreground">Grand Total</span>
              <span className="font-bold text-lg text-foreground">₹{grandTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-foreground">₹{grandTotal}</p>
          </div>
          <p className="text-xs text-muted-foreground text-right">
            Delivery to Room #{roomNumber}
          </p>
        </div>
        
        {/* ---> BUTTON CHANGE KIYA HAI <--- */}
        <Button
          onClick={handleProceedToPayment}
          className="w-full h-14 text-lg font-bold rounded-xl gradient-primary text-primary-foreground shadow-lg flex items-center justify-center gap-2"
        >
            <CreditCard className="w-5 h-5" />
            Proceed to Payment
        </Button>
      </div>
    </div>
  );
}