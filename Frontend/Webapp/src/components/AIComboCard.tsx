import { useCart } from "@/contexts/CartContext";
import { Plus, Minus, Sparkles, Star, TrendingUp } from "lucide-react";

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
    const { addItem, removeItem, getItemQuantity } = useCart();

    const cartItem = {
        id: combo.Item_ID,
        name: combo.Item_Name,
        price: combo.Current_Price,
        originalPrice: combo.Original_Price,
        image: combo.Image_URL || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
        description: combo.Items && combo.Items.length > 0
            ? combo.Items.map(i => `${i.quantity} ${i.name}`).join(" + ")
            : combo.Item_Description,
        isVeg: true,
        category: "Combos",
        isCombo: true,
        rating: 4.8,
        ratingCount: 85
    };

    const quantity = getItemQuantity(combo.Item_ID);

    return (
        <div className="bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl border border-gray-100 flex-shrink-0 w-96 md:w-[420px] snap-center group">
            {/* Image Section - Vibrant */}
            <div className="relative h-48 overflow-hidden bg-gradient-to-br from-orange-50 to-red-50">
                <img
                    src={cartItem.image}
                    alt={cartItem.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Vibrant Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
                    {/* Savings Badge - Yellow Highlight */}
                    {combo.Savings > 0 && (
                        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 text-xs font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            <span>SAVE ₹{combo.Savings}</span>
                        </div>
                    )}

                    {/* AI Badge - Blue Accent */}
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span>AI Pick</span>
                    </div>
                </div>

                {/* Match Score - Green */}
                {combo.personalization_score && (
                    <div className="absolute bottom-3 left-3 z-10">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                            {combo.personalization_score}% Match
                        </div>
                    </div>
                )}

                {/* Rating - White with Yellow Star */}
                <div className="absolute bottom-3 right-3 z-10">
                    <div className="bg-white text-gray-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        <span>4.8</span>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-4">
                {/* Title & Veg Badge */}
                <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900 text-base leading-tight line-clamp-2 flex-1">
                        {combo.Item_Name}
                    </h3>
                    {/* Green Veg Badge */}
                    <div className="flex-shrink-0 w-5 h-5 border-2 ml-2 border-green-600 flex items-center justify-center rounded-sm bg-white">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-600" />
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                    {combo.Items && combo.Items.length > 0
                        ? combo.Items.map(i => i.name).join(" • ")
                        : combo.Item_Description}
                </p>

                {/* AI Insight - Blue Accent */}
                {combo.Insight && (
                    <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                        <div className="flex items-start gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-800 font-medium leading-relaxed">
                                {combo.Insight}
                            </p>
                        </div>
                    </div>
                )}

                {/* Price & Action */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex flex-col">
                        {combo.Original_Price > combo.Current_Price && (
                            <span className="text-xs text-gray-400 line-through">₹{combo.Original_Price}</span>
                        )}
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black text-gray-900">₹{combo.Current_Price}</span>
                            {combo.Discount_Percent > 0 && (
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                    {combo.Discount_Percent}% OFF
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Vibrant Red CTA */}
                    {quantity === 0 ? (
                        <button
                            onClick={() => addItem(cartItem)}
                            className="bg-gradient-to-r from-red-500 to-red-600 text-white font-bold px-7 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:from-red-600 hover:to-red-700 transition-all text-sm uppercase tracking-wide"
                        >
                            ADD
                        </button>
                    ) : (
                        <div className="flex items-center bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg overflow-hidden h-10">
                            <button
                                onClick={() => removeItem(cartItem.id)}
                                className="w-10 h-full flex items-center justify-center text-white hover:bg-black/10 transition-colors"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-white font-bold min-w-[32px] text-center text-sm">
                                {quantity}
                            </span>
                            <button
                                onClick={() => addItem(cartItem)}
                                className="w-10 h-full flex items-center justify-center text-white hover:bg-black/10 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
