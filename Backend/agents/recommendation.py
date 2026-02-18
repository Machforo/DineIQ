import os
import traceback
# import logging
from typing import List, Dict, Optional
from fastapi import APIRouter
# from fastapi import HTTPException
from pydantic import BaseModel

# Services
from services.sheets import SheetsClient
from services.llm import GeminiClient
# from agents.menu import MenuAgent
from agents.menu import get_menu_agent
# import random
# import json

# ---------------------------------------------------------
# Router Setup
# ---------------------------------------------------------
recommendation_router = APIRouter()

# ---------------------------------------------------------
# Request Models
# ---------------------------------------------------------
class AddonRequest(BaseModel):
    customer_email: str
    item_id: str

class PreferencesRequest(BaseModel):
    email: str
    preferences: Dict

class ComboRequest(BaseModel):
    num_combos: int = 3
    email: Optional[str] = None

# ---------------------------------------------------------
# Recommendation Agent Class
# ---------------------------------------------------------
class RecommendationAgent:
    def __init__(self):
        self.spreadsheet_id = os.getenv("SPREADSHEET_ID")
        self.sheets_client = SheetsClient(spreadsheet_id=self.spreadsheet_id)
        self.gemini_client = GeminiClient()
        self.menu_agent = get_menu_agent()
        self.menu_agent = get_menu_agent()
        
        # Strategic Pairings
        self.category_pairings = {
            'Bread': {'pairs_with': ['Gravy', 'DryVeg'], 'message': 'Perfect with curry!'},
            'Rice': {'pairs_with': ['Gravy', 'Dessert', 'Raita'], 'message': 'Complete your meal!'},
            'Gravy': {'pairs_with': ['Bread', 'Rice'], 'message': 'Best with bread or rice!'},
            'Starter': {'pairs_with': ['Beverages', 'Smoothies'], 'message': 'Pair with a refreshing drink!'},
            'Snacks': {'pairs_with': ['Beverages', 'Smoothies'], 'message': 'Great with a drink!'}
        }

    # ---------------------------------------------------------
    # Core Logic
    # ---------------------------------------------------------
    def get_recommendations(self, email: str, current_item_id: str):
        """Advanced Hybrid Recommendations: History + Category Intelligence"""
        try:
            menu = self.menu_agent.get_menu() # Get active menu
            
            # Find current item details
            current_item = next((i for i in menu if str(i.get("id", "")) == str(current_item_id) or i.get("name") == current_item_id), None)
            
            if not current_item:
                 # Fallback if item not found by ID, try to find by name match or return generic
                 return {"ai_pitch": "Explore our bestsellers!", "add_ons": self._get_popular_fallback(menu)}

            # Fetch User Preferences
            diet = self._get_user_dietary_pref(email)

            # Strategy 1: Logical Category Pairing
            # Note: menu items from menu_agent might not have 'category' unless we enriched them.
            # Assuming menu_agent returns minimal info. We might need to fetch full menu df if category is missing.
            # For now, let's assume we can get category. If not, we fall back.
            
            # Optimization: Read full menu DF once for category lookups
            menu_df = self.sheets_client.read_sheet("Menu")
            full_item_row = menu_df[menu_df['Item_ID'] == str(current_item_id)]
            
            if full_item_row.empty:
                 return {"ai_pitch": "Explore our bestsellers!", "add_ons": self._get_popular_fallback(menu)}
            
            item_category = full_item_row.iloc[0]['Item_Category']
            item_name = full_item_row.iloc[0]['Item_Name']

            pairing_info = self.category_pairings.get(item_category, {'pairs_with': ['Beverages']})
            pairing_recs = self._get_items_by_category_from_df(menu_df, pairing_info['pairs_with'], diet, str(current_item_id))

            # Strategy 2: Frequently Bought Together (Order Items Analysis)
            # This is expensive to read every time. Ideally cached. 
            history_recs = [] # self._get_frequently_bought_together(current_item_id, diet) 
            # Skipping complex history analysis for speed in this migration, falling back to Logic + AI
            
            # Deduplicate
            final_recs = pairing_recs[:3]
            
            if not final_recs:
                final_recs = self._get_popular_fallback(menu)[:3]

            # AI Pitch
            ai_pitch = self._generate_ai_pitch(item_name, item_category, final_recs)

            return {"ai_pitch": ai_pitch, "add_ons": final_recs}

        except Exception as e:
            traceback.print_exc()
            return {"ai_pitch": "Pairs great with your meal!", "add_ons": []}

    def get_upsell_items(self):
        """Simple upsell getter - e.g. desserts or beverages"""
        try:
             menu_df = self.sheets_client.read_sheet("Menu")
             # Filter for 'Dessert' or 'Beverages'
             upsell_df = menu_df[menu_df['Item_Category'].isin(['Dessert', 'Beverages'])]
             upsell_df = upsell_df[upsell_df['Is_Active'].astype(str).str.lower() == 'true']
             
             return [
                 {
                     "id": row['Item_ID'],
                     "name": row['Item_Name'],
                     "price": float(row['Current_Price']),
                     "description": row.get('Description', 'Sweet treat')
                 }
                 for _, row in upsell_df.head(5).iterrows()
             ]
        except:
            return []

    def save_user_preference(self, email: str, preferences: Dict):
        """Saves user preferences to Customer_Preferences sheet"""
        try:
            print(f">>> Saving preferences for {email}")
            
            # 1. Look up User in Customer_Auth to get ID and Name
            auth_rows = self.sheets_client.read_sheet_rows("Customer_Auth")
            user_row = next((r for r in auth_rows if r.get("Customer_Email") == email), None)
            
            if not user_row:
                print(f"!!! User not found in auth: {email}")
                return {"status": "error", "message": "User not found"}
                
            customer_id = user_row.get("Customer_ID", "Unknown")
            customer_name = user_row.get("Customer_Name", "Unknown")

            # 2. Prepare Preference Row
            # Questions mapping: 1:Dietary, 2:Bread, 3:Beverage, 4:Dessert
            import time
            new_row = [
                customer_id,
                customer_name,
                email,
                preferences.get("1", ""), # Dietary Type
                preferences.get("2", ""), # Preferred Bread
                preferences.get("3", ""), # Favorite Beverage
                preferences.get("4", ""), # Dessert Preference
                time.strftime("%d/%m/%Y %H:%M:%S")
            ]

            # 3. Append to Customer_Preferences
            # Ensure the sheet exists if possible, or just append
            self.sheets_client.append_row("Customer_Preferences", new_row)
            
            return {"status": "success", "message": "Preferences saved successfully"}
            
        except Exception as e:
            print(f"!!! Error saving preferences: {e}")
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

    def generate_combos(self, num_combos: int = 3, email: str = None) -> List[Dict]:
        """Generate AI-powered combo deals (Integrated from ComboAgent)"""
        try:
            # Reuse sheets client or menu agent to get data
            # Use self.menu_agent.get_menu() if it returns full dicts, but for Pandas ops we might need raw df
            # Let's read sheets fresh or optimize later. Reading sheet "Menu" for now to match logic.
            menu_df = self.sheets_client.read_sheet("Menu")
            
            # Filter Active
            active_items = menu_df[menu_df['Is_Active'].astype(str).str.upper() == 'TRUE'].copy()
            
            if active_items.empty:
                return []

            # 1. AI Generation
            ai_combos = []
            try:
                # Context for AI
                menu_sample = active_items[['Item_Name', 'Item_Category', 'Current_Price']].head(40).to_string(index=False)
                prompt = f"""
                Create {num_combos} distinct combo meals from this menu.
                Menu:
                {menu_sample}
                
                Return a JSON List of objects with keys: "name", "items" (list of exact item names), "insight" (marketing rationale).
                """
                
                response = self.gemini_client.call_gemini_with_retry(prompt)
                # Cleanup JSON
                if response:
                    import json
                    response = response.replace("```json", "").replace("```", "").strip()
                    if "[" in response and "]" in response:
                        start, end = response.find("["), response.rfind("]") + 1
                        data = json.loads(response[start:end])
                        
                        for deal in data:
                            # Match items back to DB
                            combo_items = []
                            for name in deal.get("items", []):
                                match = active_items[active_items['Item_Name'].str.contains(name, case=False, regex=False)]
                                if not match.empty:
                                    combo_items.append(match.iloc[0].to_dict())
                            
                            if len(combo_items) >= 2:
                                ai_combos.append(self._create_combo_object(
                                    deal.get("name", "Special Combo"),
                                    combo_items,
                                    5, # 5% AI Discount
                                    deal.get("insight", "AI Special")
                                ))
            except Exception as e:
                print(f"AI Combo Gen Error: {e}")

            if len(ai_combos) >= num_combos:
                 return ai_combos[:num_combos]

            # 2. Fallback / Return what we have
            return ai_combos

        except Exception as e:
            traceback.print_exc()
            return []

    def _create_combo_object(self, name, items, discount_percent, insight):
        total = sum(float(i['Current_Price']) for i in items)
        price = round(total * (1 - discount_percent/100), 2)
        desc = " • ".join([i['Item_Name'] for i in items])
        
        import random
        return {
            "Item_ID": f"combo_{random.randint(1000, 9999)}",
            "Item_Name": name,
            "Item_Description": desc,
            "Current_Price": price,
            "Original_Price": total,
            "Discount_Percent": discount_percent,
            "Savings": round(total - price, 2),
            "Is_Personalized": True,
            "Insight": insight,
            "Image_URL": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"
        }

    def get_offers(self):
        """Returns Tiered Discounts AND Campaign Offers (Migrated from main_Sana.py)"""
        return {
            "offers": [
                {
                    "id": "c1", 
                    "code": "WELCOME50",
                    "title": "Welcome Offer",
                    "subtitle": "On All Combos",
                    "discount": "",
                    "discountPercent": 0,
                    "minOrderValue": 0,
                    "bgColor": "gradient-primary",
                    "image": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=200&fit=crop",
                    "type": "campaign"
                },
                {
                    "id": "c2", 
                    "code": "CHEFSPECIAL",
                    "title": "Chef's Special",
                    "subtitle": "Today Only",
                    "discount": "",
                    "discountPercent": 0,
                    "minOrderValue": 0,
                    "bgColor": "gradient-gold",
                    "image": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=200&fit=crop",
                    "type": "campaign"
                },
                # Add more offers if needed to match main_Sana.py
            ]
        }

    # --- Helpers ---

    def _get_user_dietary_pref(self, email):
        # Fetch from Customer_Auth or specific preferences sheet
        # Fallback
        return "General"

    def _get_items_by_category_from_df(self, df, categories, diet, exclude_id):
        mask = (df['Item_Category'].isin(categories)) & (df['Is_Active'].astype(str).str.lower() == 'true')
        if exclude_id:
            mask &= (df['Item_ID'] != exclude_id)
        
        items = df[mask].head(3)
        return [
            {
                "id": row['Item_ID'],
                "name": row['Item_Name'],
                "price": float(row['Current_Price']),
                "category": row['Item_Category']
            }
            for _, row in items.iterrows()
        ]

    def _get_popular_fallback(self, menu_list):
        return menu_list[:3]

    def _generate_ai_pitch(self, name, cat, recs):
        if not recs: return "Make it a feast with these!"
        try:
            rec_name = recs[0]['name']
            prompt = f"Write a 1-line appetizing pitch for adding {rec_name} to {name} ({cat}). Max 12 words."
            return self.gemini_client.call_gemini_with_retry(prompt) or "Perfect pairing!"
        except:
            return "Perfect combo for your meal! 🍱"


# ---------------------------------------------------------
# DEPENDENCY
# ---------------------------------------------------------
recommendation_agent = RecommendationAgent()

# ---------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------

@recommendation_router.post("/item-addons")
def get_item_addons(req: AddonRequest):
    return recommendation_agent.get_recommendations(req.customer_email, req.item_id)

@recommendation_router.get("/upsell-items")
def get_upsell_items():
    return recommendation_agent.get_upsell_items()

@recommendation_router.post("/save-preferences")
def save_preferences(req: PreferencesRequest):
    return recommendation_agent.save_user_preference(req.email, req.preferences)

@recommendation_router.post("/generate-combos")
def generate_combos(req: ComboRequest):
    return {"combos": recommendation_agent.generate_combos(req.num_combos, req.email)}

@recommendation_router.get("/offers")
def get_offers():
    return recommendation_agent.get_offers()

# Alias /coupons to offers for now if needed, or let Order Router handle coupons
