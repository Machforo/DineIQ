// Dashboard/src/context/AuthContext.tsx

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface StaffUser {
  staffId: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  staff: StaffUser | null;
  login: (staffData: StaffUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "dineiq_staff";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (staff) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [staff]);

  const login = (staffData: StaffUser) => setStaff(staffData);
  const logout = () => setStaff(null);

  return (
    <AuthContext.Provider value={{ staff, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
