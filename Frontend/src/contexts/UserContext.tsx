import React, { createContext, useContext, useState, ReactNode } from "react";

/* ---------------------------------------------------------
 * Types
 * --------------------------------------------------------- */

export interface Order {
  id: string;
  date: Date;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  status: "preparing" | "on_the_way" | "delivered";
  rating?: number;
}

interface UserProfile {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
}

interface UserContextType {
  /* Auth state */
  isLoggedIn: boolean;
  guestName: string;
  phoneNumber: string;

  /* Preferences */
  isVegMode: boolean;

  /* Profile + Orders */
  profile: UserProfile;
  orders: Order[];

  /* Actions */
  login: (guestName: string, phone?: string) => void;
  logout: () => void;
  toggleVegMode: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  addOrder: (order: Order) => void;
  rateOrder: (orderId: string, rating: number) => void;
}

/* ---------------------------------------------------------
 * Context Init
 * --------------------------------------------------------- */

const UserContext = createContext<UserContextType | undefined>(undefined);

/* ---------------------------------------------------------
 * Mock Order History (unchanged)
 * --------------------------------------------------------- */

const mockOrders: Order[] = [
  {
    id: "ord1",
    date: new Date(2025, 0, 17, 20, 30),
    items: [
      { name: "Butter Naan", quantity: 2, price: 60 },
      { name: "Paneer Tikka", quantity: 1, price: 299 },
      { name: "Dal Makhani", quantity: 1, price: 220 },
    ],
    total: 639,
    status: "delivered",
    rating: 4,
  },
];

/* ---------------------------------------------------------
 * Provider
 * --------------------------------------------------------- */

export function UserProvider({ children }: { children: ReactNode }) {
  /* Auth */
  const [guestName, setGuestName] = useState("Guest");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  /* Preferences */
  const [isVegMode, setIsVegMode] = useState(false);

  /* Profile */
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    phone: "",
    email: "",
    dateOfBirth: "",
  });

  /* Orders */
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  /* ---------------------------------------------------------
   * Auth Actions
   * --------------------------------------------------------- */

  const login = (name: string, phone?: string) => {
    setGuestName(name || "Guest");
    setPhoneNumber(phone || "");

    setProfile((prev) => ({
      ...prev,
      name: name || prev.name,
      phone: phone || prev.phone,
    }));

    setIsLoggedIn(true);
  };

  const logout = () => {
    setGuestName("Guest");
    setPhoneNumber("");
    setIsLoggedIn(false);
  };

  /* ---------------------------------------------------------
   * Other Actions
   * --------------------------------------------------------- */

  const toggleVegMode = () => {
    setIsVegMode((prev) => !prev);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));

    if (updates.name) setGuestName(updates.name);
    if (updates.phone) setPhoneNumber(updates.phone);
  };

  const addOrder = (order: Order) => {
    setOrders((prev) => [order, ...prev]);
  };

  const rateOrder = (orderId: string, rating: number) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, rating } : order
      )
    );
  };

  /* ---------------------------------------------------------
   * Context Provider
   * --------------------------------------------------------- */

  return (
    <UserContext.Provider
      value={{
        isLoggedIn,
        guestName,
        phoneNumber,
        isVegMode,
        profile,
        orders,
        login,
        logout,
        toggleVegMode,
        updateProfile,
        addOrder,
        rateOrder,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

/* ---------------------------------------------------------
 * Hook
 * --------------------------------------------------------- */

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}