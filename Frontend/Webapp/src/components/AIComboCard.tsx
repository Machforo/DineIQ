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
    name?: string;
    Item_Description: string;
    description?: string;
    Items?: ComboItem[];
    items?: ComboItem[];
    Current_Price: number;
    price?: number;
    Original_Price: number;
    Discount_Percent: number;
    Savings: number;
    Is_Veg?: boolean;
    isVeg?: boolean;
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
            {/* Image Section - Organic Vibe */}
            <div className="relative h-48 overflow-hidden bg-gradient-to-br from-secondary/20 to-primary/10">
                <img
                    src={cartItem.image}
                    alt={cartItem.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Vibrant Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
                    {/* Savings Badge - Organic Accent */}
                    {combo.Savings > 0 && (
                        <div className="bg-gradient-to-r from-accent to-[#8B4513] text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" />
                            <span>SAVE â‚¹{combo.Savings}</span>
                        </div>
                    )}

                    {/* AI Badge - Forest Accent */}
                    <div className="bg-gradient-to-r from-primary to-[#3D6151] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span>AI Pick</span>
                    </div>
                </div>

                {/* Veg Badge */}
                <div className="absolute bottom-3 left-3 z-20">
                    <div className={`w-5 h-5 border-[2px] rounded-sm flex items-center justify-center p-[2px] bg-white/95 backdrop-blur-sm shadow-lg ${(combo.Is_Veg || combo.isVeg) ? 'border-green-600' : 'border-red-600'}`}>
                        {(combo.Is_Veg || combo.isVeg) ? (
                            <div className="w-full h-full rounded-full bg-green-600" />
                        ) : (
                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-red-600" />
                        )}
                    </div>
                </div>

                {/* Match Score - Green */}
                {combo.personalization_score && (
                    <div className="absolute bottom-3 left-10 z-10">
                        <div className="bg-veg-green text-white text-[10px] uppercase font-black px-3 py-1 rounded-full shadow-lg tracking-wider">
                            {combo.personalization_score}% Match
                        </div>
                    </div>
                )}

                {/* Rating - White with Yellow Star */}
                <div className="absolute bottom-3 right-3 z-10">
                    <div className="bg-white text-gray-900 text-xs font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-maroon" />
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
                        ? combo.Items.map(i => (i as any).name || (i as any).item_name || (i as any).Item_Name || 'Item').join(" • ")
                        : (combo.items && combo.items.length > 0)
                            ? combo.items.map((i: any) => i.name || i.item_name || i.Item_Name || 'Item').join(" • ")
                            : combo.Item_Description || combo.description}
                </p>

                {/* AI Insight - Muted Accent */}
                {combo.Insight && (
                    <div className="mb-3 p-3 bg-secondary/30 rounded-xl border border-secondary">
                        <div className="flex items-start gap-2">
                            <TrendingUp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-primary font-medium leading-relaxed">
                                {combo.Insight}
                            </p>
                        </div>
                    </div>
                )}

                {/* Price & Action */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex flex-col">
                        {combo.Original_Price > combo.Current_Price && (
                            <span className="text-xs text-gray-400 line-through">â‚¹{combo.Original_Price}</span>
                        )}
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black text-gray-900">â‚¹{combo.Current_Price}</span>
                            {combo.Discount_Percent > 0 && (
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                    {combo.Discount_Percent}% OFF
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Organic Green CTA */}
                    {quantity === 0 ? (
                        <button
                            onClick={() => addItem(cartItem)}
                            className="bg-gradient-to-r from-primary to-[#3D6151] text-white font-bold px-7 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:from-[#243d33] transition-all text-sm uppercase tracking-wide"
                        >
                            ADD
                        </button>
                    ) : (
                        <div className="flex items-center bg-gradient-to-r from-primary to-[#3D6151] rounded-xl shadow-lg overflow-hidden h-10">
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

