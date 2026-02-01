import React, { createContext, useContext, useState, ReactNode } from "react";

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
  tableNumber: string;
  guestCount: number;
  guestName: string;
  phoneNumber: string;
  isLoggedIn: boolean;
  isVegMode: boolean;
  profile: UserProfile;
  user: UserProfile;
  orders: Order[];
  login: (tableNumber: string, guestCount: number, guestName?: string, phone?: string) => void;
  logout: () => void;
  toggleVegMode: () => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
  addOrder: (order: Order) => void;
  rateOrder: (orderId: string, rating: number) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Mock order history for demo
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
  {
    id: "ord2",
    date: new Date(2025, 0, 16, 13, 15),
    items: [
      { name: "Chicken Biryani Box", quantity: 2, price: 349 },
      { name: "Gulab Jamun", quantity: 2, price: 99 },
    ],
    total: 896,
    status: "delivered",
  },
  {
    id: "ord3",
    date: new Date(2025, 0, 15, 19, 45),
    items: [
      { name: "Pizza Party Deal", quantity: 1, price: 499 },
      { name: "Paneer Tikka", quantity: 1, price: 299 },
    ],
    total: 798,
    status: "delivered",
    rating: 5,
  },
];

export function UserProvider({ children }: { children: ReactNode }) {
  const [tableNumber, setTableNumber] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [guestName, setGuestName] = useState("Guest");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isVegMode, setIsVegMode] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    phone: "",
    email: "",
    dateOfBirth: "",
  });
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  // const login = (table: string, count: number, name?: string, phone?: string, email: string = "") => {
  //   setTableNumber(table);
  //   setGuestCount(count);
  //   setGuestName(name || "Guest");
  //   setPhoneNumber(phone || "");
  //   setProfile((prev) => ({
  //     ...prev,
  //     name: name || prev.name,
  //     phone: phone || prev.phone,
  //   }));
  //   setIsLoggedIn(true);
  // };

  const login = (table: string, count: number, name?: string, phone?: string, email: string = "") => {
    setTableNumber(table);
    setGuestCount(count);
    setGuestName(name || "Guest");
    setPhoneNumber(phone || "");
    setProfile((prev) => ({
      ...prev,
      name: name || prev.name,
      phone: phone || prev.phone,
      email: email || prev.email, // Email ko yaha set kiya
    }));
    setIsLoggedIn(true);
  };




  const logout = () => {
    setTableNumber("");
    setGuestCount(1);
    setGuestName("Guest");
    setPhoneNumber("");
    setIsLoggedIn(false);
  };

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

  return (
    <UserContext.Provider
      value={{
        tableNumber,
        guestCount,
        guestName,
        phoneNumber,
        isLoggedIn,
        isVegMode,
        profile,
        user: profile,
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

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}