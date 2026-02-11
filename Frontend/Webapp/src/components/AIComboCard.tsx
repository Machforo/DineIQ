import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Sparkles, TrendingUp, ChefHat, Tag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface ComboItem {
    name: string;
    quantity: number;
    price: number;
    category?: string;
}

interface Combo {
    Item_ID: string;
    Item_Name: string;
    Item_Description: string;
    Items?: ComboItem[];
    Current_Price: number;
    Original_Price: number;
    Discount_Percent: number;
    Savings: number;
    Is_Personalized?: boolean;
    Insight?: string;
    Image_URL?: string;
    personalization_score?: number;
    customer_type?: string;
}

interface ComboCardProps {
    combo: Combo;
}

export default function AIComboCard({ combo }: ComboCardProps) {
    const { addItem } = useCart();

    const handleAddToCart = () => {
        addItem({
            id: combo.Item_ID,
            name: combo.Item_Name,
            price: combo.Current_Price,
            image: combo.Image_URL || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
            description: combo.Item_Description,
            category: "Combos",
            isVeg: true, // Defaulting to true as per most combos, or could be derived
            rating: 4.5,
            ratingCount: 0,
            isCombo: false // Treat as single unit
        });

        toast.success("✨ Combo added to cart!", {
            description: combo.Item_Name,
        });
    };

    return (
        <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm">
            {/* Image Section with Premium Overlay */}
            <div className="relative h-56 overflow-hidden">
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />

                <img
                    src={combo.Image_URL || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"}
                    alt={combo.Item_Name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />

                {/* Top Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2 z-20">
                    {combo.Is_Personalized && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center gap-1.5 px-3 py-1.5 shadow-lg">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            <span className="font-semibold">AI Curated</span>
                        </Badge>
                    )}
                    {combo.customer_type && (
                        <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex items-center gap-1.5 px-3 py-1.5 shadow-lg">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span className="font-semibold text-xs">{combo.customer_type}</span>
                        </Badge>
                    )}
                </div>

                {/* Discount Badge - Top Right */}
                <div className="absolute top-3 right-3 z-20">
                    <div className="relative">
                        <div className="absolute inset-0 bg-red-500 blur-md opacity-50 rounded-full" />
                        <Badge className="relative bg-gradient-to-br from-red-500 to-rose-600 text-white text-base font-bold px-4 py-2 shadow-xl">
                            {combo.Discount_Percent}% OFF
                        </Badge>
                    </div>
                </div>

                {/* Savings Badge - Bottom Left on Image */}
                <div className="absolute bottom-3 left-3 z-20">
                    <div className="bg-green-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                        <Tag className="w-4 h-4" />
                        <span className="font-bold text-sm">Save ₹{combo.Savings}</span>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-5 space-y-4">
                {/* Combo Name */}
                <div>
                    <h3 className="font-bold text-xl text-gray-900 line-clamp-1 mb-1">
                        {combo.Item_Name}
                    </h3>
                    {combo.personalization_score && combo.personalization_score >= 70 && (
                        <div className="flex items-center gap-1.5 text-xs text-purple-600 font-medium">
                            <ChefHat className="w-3.5 h-3.5" />
                            <span>Highly Recommended ({combo.personalization_score}% match)</span>
                        </div>
                    )}
                </div>

                {/* Items List - CRITICAL SECTION */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100 space-y-2.5">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-orange-800 uppercase tracking-wide">
                            Combo Includes:
                        </p>
                        <div className="h-px flex-1 bg-orange-200 ml-3" />
                    </div>

                    {/* Display Items from Items array OR Item_Description */}
                    {combo.Items && combo.Items.length > 0 ? (
                        <div className="space-y-2">
                            {combo.Items.map((item, idx) => (
                                <div key={idx} className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2 flex-1">
                                        <span className="text-orange-500 font-bold text-sm mt-0.5">•</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-800 leading-snug">
                                                {item.quantity} × {item.name}
                                            </p>
                                            {item.category && (
                                                <p className="text-xs text-gray-500 mt-0.5">{item.category}</p>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                                        ₹{(item.price * item.quantity).toFixed(0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : combo.Item_Description ? (
                        /* Fallback: Parse Item_Description if Items array not available */
                        <div className="space-y-1.5">
                            {combo.Item_Description.split('+').map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-orange-500 font-bold">•</span>
                                    <p className="text-sm text-gray-700 font-medium">
                                        {item.trim()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-600 italic">Premium combo selection</p>
                    )}
                </div>

                {/* AI Insight */}
                {combo.Insight && (
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                        <p className="text-xs text-purple-900 leading-relaxed flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                            <span className="italic">{combo.Insight}</span>
                        </p>
                    </div>
                )}

                {/* Pricing Section */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                            ₹{combo.Current_Price}
                        </span>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 line-through">
                                ₹{combo.Original_Price}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Add to Cart Button */}
                <Button
                    onClick={handleAddToCart}
                    className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white font-bold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] group"
                >
                    <ShoppingCart className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                    Add Combo to Cart
                </Button>
            </div>
        </Card>
    );
}
