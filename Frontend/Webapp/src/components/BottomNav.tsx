import { Home, Search, ShoppingBag, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";

export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const { totalItems } = useCart();
    const path = location.pathname;

    const isActive = (route: string) => path === route;

    const navItems = [
        { icon: Home, label: "Dining", path: "/home" },
        { icon: Search, label: "Search", path: "/search" }, // Could lead to menu with search focus
        { icon: ShoppingBag, label: "Cart", path: "/cart", badge: totalItems },
        { icon: User, label: "Profile", path: "/profile" },
    ];

    // Hide on login/splash screens and checkout flow
    if (path === "/" || path === "/login" || path === "/cart" || path === "/payment") return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-200 safe-bottom shadow-premium">
            <div className="flex justify-around items-center px-2 py-2">
                {navItems.map((item) => {
                    const isSearch = item.label === "Search";

                    if (isSearch) {
                        return (
                            <button
                                key={item.label}
                                onClick={() => navigate("/home", { state: { focusSearch: true } })}
                                className={`flex flex-col items-center justify-center p-2 w-full transition-all duration-200 active:scale-95`}
                            >
                                <div className="relative">
                                    <item.icon
                                        className={`w-6 h-6 mb-1 ${isActive(item.path)
                                            ? "text-primary fill-primary/10"
                                            : "text-muted-foreground"
                                            }`}
                                        strokeWidth={isActive(item.path) ? 2.5 : 2}
                                    />
                                </div>
                                <span className={`text-[10px] font-semibold tracking-wide text-muted-foreground`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <Link
                            key={item.label}
                            to={item.path}
                            className={`flex flex-col items-center justify-center p-2 w-full transition-all duration-200 active:scale-95`}
                        >
                            <div className="relative">
                                <item.icon
                                    className={`w-6 h-6 mb-1 ${isActive(item.path)
                                        ? "text-primary fill-primary/10"
                                        : "text-muted-foreground"
                                        }`}
                                    strokeWidth={isActive(item.path) ? 2.5 : 2}
                                />
                                {item.badge ? (
                                    <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                                        {item.badge}
                                    </span>
                                ) : null}
                            </div>
                            <span
                                className={`text-[10px] font-semibold tracking-wide ${isActive(item.path) ? "text-primary" : "text-muted-foreground"
                                    }`}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
