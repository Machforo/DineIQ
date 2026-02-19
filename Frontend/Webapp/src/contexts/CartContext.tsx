import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { MenuItem } from "@/lib/data";
import { useUser } from "./UserContext";

interface CartItem extends MenuItem {
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  getItemQuantity: (itemId: string) => number;
  totalItems: number;
  totalPrice: number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { fullMenu } = useUser();

  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("dineiq_cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("dineiq_cart", JSON.stringify(items));
  }, [items]);

  const addItem = (item: MenuItem) => {
    // If it's a combo, deconstruct it into individual items
    if (item.isCombo && item.comboItems && item.comboItems.length > 0) {
      item.comboItems.forEach(componentName => {
        // ── Check if this is an AI-encoded combo item: "ItemID||Name||Price" ──
        if (componentName.includes('||')) {
          const parts = componentName.split('||');
          const itemId = parts[0]?.trim();
          const itemName = parts[1]?.trim();
          const itemPrice = parseFloat(parts[2]?.trim() || "0");

          addItem({
            ...item,
            id: itemId || `ind-${Date.now()}-${Math.random()}`,
            name: itemName || componentName,
            price: itemPrice,
            isCombo: false,
            comboItems: [],
            category: "General", // Default category for unpacked items
          });
          return;
        }

        // ── Standard logic: Clean name and look up in fullMenu ────────────────
        // Clean the component name (remove multipliers like "2x", "2 ")
        const cleanName = componentName.replace(/^\d+x?\s+/, '').trim().toLowerCase();

        // Find matching item in fullMenu
        const matchedItem = fullMenu.find(m => m.name.toLowerCase() === cleanName);

        if (matchedItem) {
          addItem(matchedItem); // Recursively add the individual item
        } else {
          // Fallback: If not found in fullMenu, add it as a new standard item with a placeholder ID
          addItem({
            ...item,
            id: `ind-${Date.now()}-${Math.random()}`,
            name: componentName,
            isCombo: false,
            comboItems: [],
            price: 0,
          });
        }
      });
      return; // Stop here for the combo item itself
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prev.filter((i) => i.id !== itemId);
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
      );
    }
  };

  const getItemQuantity = (itemId: string) => {
    return items.find((i) => i.id === itemId)?.quantity || 0;
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        getItemQuantity,
        totalItems,
        totalPrice,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
