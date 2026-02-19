import { ChatMessage as ChatMessageType, ChatCombo } from "@/utils/chatUtils";
import { cn } from "@/lib/utils";
import { Bot, User, Plus, Minus, ShoppingCart, Sparkles } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ChatMessageProps {
  message: ChatMessageType;
  onSend?: (text: string) => void;
}

// Detect when AI offers a combo suggestion at the end of a message
function hasComboOffer(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    (lower.includes("combo") || lower.includes("bundle") || lower.includes("deal")) &&
    (lower.includes("would you like") || lower.includes("want a combo") || lower.includes("suggest"))
  );
}

// ── Quick combo chip presets (shown when AI asks "want a combo?") ─────────────
const COMBO_CHIPS = [
  { label: "🍱 Starter Feast", msg: "Make me a Starter Feast combo" },
  { label: "🌶️ Spicy Lover Combo", msg: "Make me a Spicy Lover combo" },
  { label: "🥗 Light Bite Combo", msg: "Make me a light single-person combo" },
  { label: "👨‍👩‍👧 Family Platter", msg: "Make me a Family Sharing Platter combo" },
];

export function ChatMessage({ message, onSend }: ChatMessageProps) {
  const isAI = message.role === 'ai';

  return (
    <div
      className={cn(
        "flex w-full mb-6 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isAI ? "justify-start" : "justify-end"
      )}
    >
      {/* Avatar — AI */}
      {isAI && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E23744] to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md mt-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div className="flex flex-col gap-3 max-w-[88%]">
        {/* ── Main text bubble ─────────────────────────────────────────────── */}
        <div
          className={cn(
            "rounded-2xl px-5 py-3 shadow-sm relative group text-sm leading-relaxed",
            isAI
              ? "bg-white text-gray-800 rounded-tl-sm border border-gray-100"
              : "bg-[#E23744] text-white rounded-tr-sm shadow-md"
          )}
        >
          <p className="whitespace-pre-wrap break-words font-medium">{message.content}</p>
          <span className={cn(
            "text-[10px] mt-1.5 block opacity-0 group-hover:opacity-60 transition-opacity absolute -bottom-5 min-w-max",
            isAI ? "left-0 text-gray-400" : "right-0 text-gray-400"
          )}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* ── Structured combo cards from backend ──────────────────────────── */}
        {isAI && message.combos && message.combos.length > 0 && (
          <ComboCards combos={message.combos} />
        )}

        {/* ── Combo offer chips (when no structured combos, but AI offers) ── */}
        {isAI && !message.combos && hasComboOffer(message.content) && onSend && (
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#E23744]" />
              Pick a combo style
            </p>
            <div className="flex flex-wrap gap-2">
              {COMBO_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => onSend(chip.msg)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border-2 border-[#E23744]/20 rounded-xl text-xs font-bold text-[#E23744] hover:bg-[#E23744] hover:text-white hover:border-[#E23744] transition-all duration-200 active:scale-95 shadow-sm"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Avatar — User */}
      {!isAI && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-4 h-4 text-gray-500" />
        </div>
      )}
    </div>
  );
}

// ── Combo Cards component — uses real structured data from backend ─────────────
function ComboCards({ combos }: { combos: ChatCombo[] }) {
  return (
    <div className="flex flex-col gap-3">
      {combos.map((combo) => (
        <ComboCard key={combo.id} combo={combo} />
      ))}
    </div>
  );
}

function ComboCard({ combo }: { combo: ChatCombo }) {
  const { addItem, getItemQuantity, removeItem } = useCart();
  const { toast } = useToast();
  const [added, setAdded] = useState(false);

  const cartItemId = `ai_combo_${combo.id}`;
  const quantity = getItemQuantity(cartItemId);

  const description = combo.items.map(i => i.name).join(" • ");

  const handleAdd = () => {
    addItem({
      id: cartItemId,
      name: combo.name,
      price: combo.totalPrice,
      description,
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
      isVeg: true,
      category: "Combos",
      isCombo: true,
      rating: 4.8,
      ratingCount: 100,
    });
    setAdded(true);
    toast({
      title: "Added to cart! 🛒",
      description: `${combo.name} — ₹${combo.totalPrice}`,
    });
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#E23744] to-orange-500 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍱</span>
          <h4 className="text-white font-black text-sm">{combo.name}</h4>
        </div>
        <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          AI Combo
        </span>
      </div>

      {/* Items list */}
      <div className="px-4 pt-3 pb-2 space-y-1.5">
        {combo.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-sm text-gray-700 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E23744] flex-shrink-0" />
              {item.name}
            </span>
            <span className="text-sm font-bold text-gray-800">₹{item.price}</span>
          </div>
        ))}
      </div>

      {/* Total + Cart button */}
      <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between mt-1">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Combo Total</p>
          <p className="text-lg font-black text-gray-900">₹{combo.totalPrice}</p>
          {combo.savings > 0 && (
            <p className="text-[10px] text-green-600 font-bold">You save ₹{combo.savings}!</p>
          )}
        </div>

        {/* Add / quantity control */}
        {quantity === 0 ? (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-[#E23744] text-white text-sm font-black px-5 py-2.5 rounded-xl hover:bg-[#c0313e] active:scale-95 transition-all shadow-sm hover:shadow-md"
          >
            <ShoppingCart className="w-4 h-4" />
            Add to Cart
          </button>
        ) : (
          <div className="flex items-center bg-[#E23744] rounded-xl overflow-hidden h-10 shadow-md">
            <button
              onClick={() => removeItem(cartItemId)}
              className="w-10 h-full flex items-center justify-center text-white hover:bg-black/10 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-white font-black min-w-[28px] text-center text-sm">{quantity}</span>
            <button
              onClick={handleAdd}
              className="w-10 h-full flex items-center justify-center text-white hover:bg-black/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
