import { API_BASE_URL } from "./config";


export const api = {
    // Fetch Menu (Personalized)
    fetchMenu: async (email: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/menu`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customer_email: email }),
            });
            const data = await response.json();
            // Backend returns { "menu": { "status": "success", ... } }
            // We need to unwrap it for the frontend to access "status" directly
            return data.menu || data;
        } catch (error) {
            console.error("Fetch Menu Error:", error);
            return null;
        }
    },

    // Fetch Offers
    fetchOffers: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/offers`);
            return await response.json();
        } catch (error) {
            console.error("Fetch Offers Error:", error);
            return { offers: [] };
        }
    },

    // Save Preferences
    savePreferences: async (email: string, preferences: any) => {
        try {
            const response = await fetch(`${API_BASE_URL}/save-preferences`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, preferences }),
            });
            return await response.json();
        } catch (error) {
            console.error("Save Prefs Error:", error);
            return null;
        }
    },

    // Get Recommendations (Pairing)
    fetchRecommendations: async (email: string, itemId: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/item-addons`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customer_email: email, item_id: itemId }),
            });
            return await response.json();
        } catch (error) {
            console.error("Fetch Recs Error:", error);
            return null;
        }
    },

    // Get Pricing Strategy (Nudge)
    async getPricingStrategy(email: string, cartItems: any[]) {
        try {
            const res = await fetch(`${API_BASE_URL}/pricing-strategy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customer_email: email, cart_items: cartItems }),
            });
            return await res.json();
        } catch (e) {
            console.error("Pricing Strategy Error:", e);
            return null;
        }
    },

    async fetchUpsellItems() {
        try {
            const res = await fetch(`${API_BASE_URL}/upsell-items`);
            return await res.json();
        } catch (e) {
            console.error("Upsell Fetch Error:", e);
            return null;
        }
    },

    async fetchCoupons() {
        try {
            const res = await fetch(`${API_BASE_URL}/coupons`);
            return await res.json();
        } catch (e) {
            console.error("Coupon Fetch Error:", e);
            return null;
        }
    },

    async generateCombos(num: number = 3, email?: string) {
        try {
            const res = await fetch(`${API_BASE_URL}/generate-combos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ num_combos: num, email }),
            });
            return await res.json();
        } catch (e) {
            console.error("Combo Gen Error:", e);
            return null;
        }
    },

    async fetchOrderHistory(email: string) {
        try {
            const res = await fetch(`${API_BASE_URL}/order-history/${email}`);
            return await res.json();
        } catch (e) {
            console.error("Order History Error:", e);
            return { orders: [] };
        }
    },

    async placeOrder(orderData: any) {
        try {
            const res = await fetch(`${API_BASE_URL}/place-order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orderData),
            });
            return await res.json();
        } catch (e) {
            console.error("Place Order Error:", e);
            return null;
        }
    },

    async submitReview(reviewData: any) {
        try {
            const res = await fetch(`${API_BASE_URL}/reviews/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reviewData),
            });
            return await res.json();
        } catch (e) {
            console.error("Submit Review Error:", e);
            return null;
        }
    },

    async fetchLatestReview(email: string) {
        try {
            const res = await fetch(`${API_BASE_URL}/reviews/customer/${email}`);
            return await res.json();
        } catch (e) {
            console.error("Fetch Latest Review Error:", e);
            return null;
        }
    }
};
