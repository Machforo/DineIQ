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
        { icon: Home, label: "Home", path: "/home" },
        { icon: Search, label: "Search", path: "/search" },
        { icon: ShoppingBag, label: "Cart", path: "/cart", badge: totalItems },
        { icon: User, label: "Profile", path: "/profile" },
    ];

    if (path === "/" || path === "/login" || path === "/cart" || path === "/payment") return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
            {/* Blur gradient fade above nav */}
            <div className="h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            <div className="bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                <div className="flex justify-around items-center px-2 py-1 pb-3">
                    {navItems.map((item) => {
                        const active = isActive(item.path);
                        const isSearch = item.label === "Search";

                        const content = (
                            <div className={`flex flex-col items-center justify-center gap-1 py-1.5 px-4 rounded-2xl transition-all duration-200 ${active ? 'bg-[#E23744]/10' : ''}`}>
                                <div className="relative">
                                    <item.icon
                                        className={`w-5 h-5 transition-all duration-200 ${active ? 'text-[#E23744]' : 'text-gray-400'}`}
                                        strokeWidth={active ? 2.5 : 1.8}
                                        fill={active ? 'rgba(226,55,68,0.15)' : 'none'}
                                    />
                                    {item.badge ? (
                                        <span className="absolute -top-2 -right-2 bg-[#E23744] text-white text-[9px] font-black min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center shadow-sm animate-in zoom-in-50 duration-200">
                                            {item.badge}
                                        </span>
                                    ) : null}
                                </div>
                                <span className={`text-[10px] font-bold tracking-wide transition-colors duration-200 ${active ? 'text-[#E23744]' : 'text-gray-400'}`}>
                                    {item.label}
                                </span>
                                {active && (
                                    <div className="w-1 h-1 rounded-full bg-[#E23744]" />
                                )}
                            </div>
                        );

                        if (isSearch) {
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => navigate("/home", { state: { focusSearch: true } })}
                                    className="flex-1 active:scale-95 transition-transform duration-100"
                                >
                                    {content}
                                </button>
                            );
                        }

                        return (
                            <Link
                                key={item.label}
                                to={item.path}
                                className="flex-1 active:scale-95 transition-transform duration-100"
                            >
                                {content}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
