# DineIQ\Backend\agents\menu.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
import os
import json
import pandas as pd

# import agents and services classes
from services.sheets import SheetsClient
from services.llm import GroqClient
from functools import lru_cache

# ---------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------
from dotenv import load_dotenv
load_dotenv()

# ---------------------------------------------------------
# FastAPI router
# ---------------------------------------------------------
from fastapi import APIRouter, Depends
menu_router = APIRouter()

# ---------------------------------------------------------
# Class definition for Menu related interactions
# ---------------------------------------------------------
class MenuAgent:
    def __init__(self):
        self.spreadsheet_id = os.getenv("SPREADSHEET_ID")
        self.menu_sheet_name = "Menu"

        if not self.spreadsheet_id:
            raise ValueError("SPREADSHEET_ID is not set in environment variables")

        self.sheets_client = SheetsClient(
            spreadsheet_id=self.spreadsheet_id
        )

        # Helper Data (Migrated from menu_agent.py)
        self.category_images = {
            'Bread': 'https://images.unsplash.com/photo-1509440159596-0249088772ff',
            'Rice': 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2',
            'Gravy': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
            'Dry Veg': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
            'Starter': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0',
            'Snacks': 'https://images.unsplash.com/photo-1601050690597-df0568f70950',
            'Beverages': 'https://images.unsplash.com/photo-1437418747212-8d9709afab22',
            'Smoothies': 'https://images.unsplash.com/photo-1505252585461-04db1eb84625',
            'Dessert': 'https://images.unsplash.com/photo-1488477181946-6428a0291777',
            'Raita': 'https://images.unsplash.com/photo-1596797038530-2c107229654b',
        }
        
        self.veg_keywords = ['paneer', 'aloo', 'gobi', 'dal', 'roti', 'naan', 'rice', 
                            'veg', 'vegetable', 'bhindi', 'palak', 'matar', 'raita',
                            'lassi', 'juice', 'smoothie', 'salad', 'idli', 'dosa',
                            'sambar', 'vada', 'poha', 'upma', 'paratha', 'kulcha',
                            'chole', 'rajma', 'kofta', 'baingan', 'bharta', 'jeera',
                            'curriveg', 'mix-veg', 'paneer-tikka']

    # -------------------------------------------------------------------
    # 🍽️ Public API
    # -------------------------------------------------------------------
    def get_menu(self) -> list[dict]:
        """
        Fetch all active dishes from menu sheet.
        Returns only name & current price.
        """

        df = self.sheets_client.read_sheet(self.menu_sheet_name)

        # Defensive column check
        # Item_ID	Item_Name	Item_Category	Base_Price	Low_Cap_Price	High_Cap_Price	Current_Price	Is_Active
        required_columns = {"Item_ID", "Item_Name", "Item_Category", "Base_Price", "Low_Cap_Price", "High_Cap_Price", "Current_Price", "Is_Active"}
        missing = required_columns - set(df.columns)
        if missing:
            raise ValueError(f"Missing columns in Menu sheet: {missing}")

        # Normalize Is_Active
        df["Is_Active"] = (
            df["Is_Active"]
            .astype(str)
            .str.strip()
            .str.lower()
            .isin(["active", "1", "yes", "true"])
        )

        # Filter active items
        df = df[df["Is_Active"]]
        
        # DEDUPLICATION: Remove duplicate items based on Item_Name
        df = df.drop_duplicates(subset=["Item_Name"], keep="first")
        print(f">>> Menu: {len(df)} unique active items after deduplication")

        # Shape response for frontend
        return [self._format_item_row(row) for _, row in df.iterrows()]

    # -------------------------------------------------------------------
    # 🔹 Format menu for frontend (simplified)
    # -------------------------------------------------------------------
    def format_menu(self, menu_df) -> list[dict]:
        """
        Convert menu dataframe into a list of dictionaries for frontend consumption.

        Matching can include one or more of:
            - Dietary
            - AOV
            - Attitude
            - Favorites
        """

        print("\nFormatting the Menu")
        formatted_menu = []

        # Heuristic: top 30% Gemini-ranked items are considered AOV/Attitude aligned
        if "gemini_rank" in menu_df.columns and not menu_df.empty:
            rank_threshold = max(1, int(len(menu_df) * 0.3))
        else:
            rank_threshold = None

        # test logic with final output ranking
        menu_df = menu_df.reset_index(drop=True)

        for _, row in menu_df.iterrows():
            matches = []

            # Favorites (explicit)
            if row.get("is_favorite", False):
                matches.append("Favorites")

            # Dietary (implicit — Gemini already filtered)
            matches.append("Dietary")

            # AOV / Attitude (implicit via Gemini ranking)
            if rank_threshold is not None and row.get("gemini_rank", 9999) < rank_threshold:
                matches.extend(["AOV", "Attitude"])

            item_obj = self._format_item_row(row)
            item_obj.update({
                "matching": matches if matches else None,
                "rank": int(_ + 1)
            })
            formatted_menu.append(item_obj)

        return formatted_menu

    # -------------------------------------------------------------------
    # 🍽️ Personalized Menu
    # -------------------------------------------------------------------
    def get_customized_menu(self, customer_id: str) -> list[dict]:
        """
        Returns personalized menu for a customer based on the following categories
        already derived in Customer_Insights sheet.

        HARD RULE:
        - Dietary preference is a strict filter (handled by Gemini).

        SOFT RULES:
        - Favorites
        - AOV
        - Attitude
        are used only for ranking, not filtering.
        """

        # -------------------------------------------------
        # 1️⃣ LOAD MENU
        # -------------------------------------------------
        menu_df = self.sheets_client.read_sheet(self.menu_sheet_name)
        

        if menu_df.empty:
            return []

        print("Menu has ", len(menu_df), " items")

        # Normalize Is_Active
        menu_df["Is_Active"] = (
            menu_df["Is_Active"]
            .astype(str)
            .str.strip()
            .str.lower()
            .isin(["active", "1", "yes", "true"])
        )

        # Filter active items
        menu_df = menu_df[menu_df["Is_Active"]]

        print("Menu has ", len(menu_df), " active items")

        # Normalize
        menu_df["Item_Name"] = menu_df["Item_Name"].astype(str)
        menu_df["Current_Price"] = menu_df["Current_Price"].astype(float)

        # -------------------------------------------------
        # 2️⃣ LOAD CUSTOMER INSIGHTS
        # -------------------------------------------------
        insights_df = self.sheets_client.read_sheet("Customer_Insights")
        customer_df = insights_df[insights_df["Customer_ID"] == customer_id]

        print("Found ", len(insights_df), " customers insights")
        print()
        print("Inferring: ")

        if customer_df.empty:
            print("\nReturning Original Menu")
            return self.format_menu(menu_df)

        customer = customer_df.iloc[0]

        dietary_pref = str(customer.get("Dietary", "")).strip()
        favorites_raw = str(customer.get("Favorites", ""))
        aov = str(customer.get("AOV", "")).strip()
        attitude = str(customer.get("Attitude", "")).strip()

        favorites = {
            fav.strip().lower()
            for fav in favorites_raw.split(",")
            if fav.strip()
        }

        print(customer["Customer_ID"])
        print(customer["Customer_Name"])
        print(dietary_pref)
        print(favorites)
        print(aov)
        print(attitude)
        print()

        # -------------------------------------------------
        # 3️⃣ PREPARE SAFE MENU (Gemini decides dietary)
        # -------------------------------------------------
        menu_items_for_llm = [
            {
                "name": row["Item_Name"],
                "price": row["Current_Price"],
            }
            for _, row in menu_df.iterrows()
        ]

        customer_profile = {
            "dietary": dietary_pref,
            "favorites": list(favorites),
            "aov": aov,
            "attitude": attitude,
        }

        # -------------------------------------------------
        # 4️⃣ GEMINI: FILTER + RANK (STRICT DIETARY)
        # -------------------------------------------------
        ranked_names = self.rank_menu_items_with_ai(
            menu_items=menu_items_for_llm,
            customer_profile=customer_profile,
        )

        if not ranked_names:
            print("\nNo response from LLM, Returning Original Menu")
            return self.format_menu(menu_df)

        print("Ranking the menu items returned by LLM")

        # Keep only items Gemini approved
        menu_df = menu_df[
            menu_df["Item_Name"].isin(ranked_names)
        ].copy()

        menu_df["gemini_rank"] = menu_df["Item_Name"].apply(
            lambda x: ranked_names.index(x)
        )

        # -------------------------------------------------
        # 5️⃣ FAVORITES BOOST (FINAL TIE-BREAKER)
        # -------------------------------------------------
        # menu_df["is_favorite"] = (
        #     menu_df["Item_Name"].str.lower().isin(favorites)
        # )

        def is_favorite_item(item_name: str, favorites: set[str]) -> bool:
            item = item_name.lower()
            return any(
                fav in item
                for fav in favorites
            )

        menu_df["is_favorite"] = menu_df["Item_Name"].apply(
            lambda name: is_favorite_item(name, favorites)
        )

        # -------------------------------------------------
        # 6️⃣ FINAL SORTING
        # -------------------------------------------------
        print("Sorting the menu items based on rank")
        menu_df = menu_df.sort_values(
            by=["is_favorite", "gemini_rank"],
            ascending=[False, True],
        )

        # -------------------------------------------------
        # 7️⃣ FORMAT FOR FRONTEND
        # -------------------------------------------------
        print("\nReturning Customized Menu")
        return self.format_menu(menu_df)

    
    # -------------------------------------------------------------------
    # 🤖 AI-based ranking (SAFE + INTERPRETIVE)
    # -------------------------------------------------------------------
    def rank_menu_items_with_ai(
        self,
        menu_items: list[dict],
        customer_profile: dict
    ) -> list[str]:
        """
        Uses Groq AI to:
        1. Remove items violating dietary preference
        2. Rank remaining items using AOV + Attitude
        """

        if not menu_items:
            return []

        item_names = [item["name"] for item in menu_items]

        prompt = f"""
    You are a restaurant menu personalization assistant.

    The customer attributes below are PRE-CLASSIFIED.
    DO NOT reinterpret them.

    Customer Profile:
    - Dietary: {customer_profile.get("dietary")}
    - Favorites: {customer_profile.get("favorites")}
    - AOV Segment: {customer_profile.get("aov")}
    - Attitude Segment: {customer_profile.get("attitude")}

    STRICT RULES:
    - REMOVE menu items that violate the dietary preference.
    - Dietary meanings:
    - Vegetarian → no meat, fish
    - Vegan → no animal products
    - Eggetarian → veg + egg
    - Jain → no onion, garlic, root vegetables
    - Non-Vegetarian → allow all
    - Do NOT invent items.
    - Do NOT rename items.

    SOFT RANKING RULES:
    - Favorites should be ranked higher when reasonable.
    - AOV:
    - Low Spender → value-for-money
    - Mid Spender → balanced
    - High / Premium → expensive / premium items
    - Attitude:
    - Value-Seeker → safe, popular, good value
    - Quality-Seeker → premium, chef-special
    - Refund-Prone → safe, familiar, low-risk

    Menu Items (name + price):
    {json.dumps(menu_items, indent=2)}

    OUTPUT FORMAT (IMPORTANT):
    - Return ONLY a valid JSON array of item names
    - First items = best recommendations
    - No explanation, no markdown
    """

        groq_client = GroqClient()
        response = groq_client.call_groq_with_retry(prompt)

        if not response:
            return item_names

        try:
            ranked = json.loads(response)
            if isinstance(ranked, list):
                print("\nReturning Ranked Menu")
                return ranked
        except Exception:
            pass

        return item_names

    # -------------------------------------------------------------------
    # 🚧 Future Extensions (stubs)
    # -------------------------------------------------------------------
    def get_smart_combos(self, customer_id: str) -> list:
        return []

    # -------------------------------------------------------------------
    # 🧠 Smart Menu / Frontend Logic (Migrated from menu_agent.py)
    # -------------------------------------------------------------------
    def _is_veg_item(self, item_name: str) -> bool:
        """Detect if item is vegetarian based on name"""
        name_lower = str(item_name).lower()
        non_veg = ['chicken', 'mutton', 'fish', 'egg', 'meat', 'prawn', 'lamb', 'pork', 'beef', 'duck', 'shrimp', 'crab', 'keema', 'pepperoni', 'ham', 'bacon']
        if any(word in name_lower for word in non_veg): return False
        if any(word in name_lower for word in self.veg_keywords): return True
        return True # Default safe

    def _format_item_row(self, row: pd.Series) -> dict:
        """Robust unified formatter for a menu item row"""
        item_name = str(row.get('Item_Name', 'Unknown'))
        category = str(row.get('Item_Category', 'General'))
        is_veg = self._is_veg_item(item_name)
        
        # Check if Sheet already has Is_Veg
        if 'Is_Veg' in row and pd.notna(row['Is_Veg']):
            sheet_veg = str(row['Is_Veg']).strip().lower()
            if sheet_veg in ['yes', '1', 'true', 'veg']:
                is_veg = True
            elif sheet_veg in ['no', '0', 'false', 'non-veg']:
                is_veg = False

        return {
            'id': str(row.get('Item_ID', '')),
            'Item_ID': str(row.get('Item_ID', '')),
            'name': item_name,
            'Item_Name': item_name,
            'description': self._get_item_description(category, item_name),
            'Item_Description': self._get_item_description(category, item_name),
            'price': float(row['Current_Price']) if pd.notna(row.get('Current_Price')) and row['Current_Price'] != '' else 0.0,
            'Current_Price': float(row['Current_Price']) if pd.notna(row.get('Current_Price')) and row['Current_Price'] != '' else 0.0,
            'image': self._get_image_for_item(category, item_name),
            'Image_URL': self._get_image_for_item(category, item_name),
            'isVeg': is_veg,
            'Is_Veg': is_veg,
            'category': category,
            'Item_Category': category,
            'Dietary_Type': 'Veg' if is_veg else 'Non-Veg',
            'rating': 4.5,
            'ratingCount': 100
        }

    def _get_image_for_item(self, category: str, item_name: str) -> str:
        """Get appropriate image based on category or item name"""
        if category in self.category_images: return self.category_images[category]
        
        name_lower = str(item_name).lower()
        if 'paneer' in name_lower or 'butter' in name_lower: return 'https://images.unsplash.com/photo-1585937421612-70a008356fbe'
        elif 'biryani' in name_lower or 'rice' in name_lower: return 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2'
        elif 'naan' in name_lower or 'roti' in name_lower: return 'https://images.unsplash.com/photo-1509440159596-0249088772ff'
        elif 'dal' in name_lower: return 'https://images.unsplash.com/photo-1546833999-b9f581a1996d'
        elif 'dessert' in name_lower or 'sweet' in name_lower: return 'https://images.unsplash.com/photo-1488477181946-6428a0291777'
        return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'

    def _get_item_description(self, category: str, item_name: str) -> str:
        """Generate description based on category"""
        descriptions = {
            'Bread': 'Freshly baked bread',
            'Rice': 'Aromatic basmati rice',
            'Gravy': 'Rich and flavorful curry',
            'Dry Veg': 'Delicious dry preparation',
            'Starter': 'Perfect appetizer',
            'Snacks': 'Tasty snack',
            'Beverages': 'Refreshing beverage',
            'Smoothies': 'Healthy smoothie',
            'Dessert': 'Sweet treat',
            'Raita': 'Cool yogurt accompaniment'
        }
        return descriptions.get(category, f'Delicious {category}')

    def get_smart_menu(self, email: str = None) -> dict:
        """
        Get menu organized smartly for DineIQ frontend (Sections: Favorites, Bestsellers, etc.)
        Reads Orders and Order_Items from Sheets for history.
        Uses Caching for Performance.
        """
        try:
            # -------------------------------------------------
            # 1. Check Cache for Global Data (Base Menu + Bestsellers/Chef Special)
            # -------------------------------------------------
            if not hasattr(self, '_smart_menu_cache'):
                self._smart_menu_cache = {}
                self._smart_menu_last_update = 0
            
            current_time = pd.Timestamp.now().timestamp()
            CACHE_TTL = 300 # 5 Minutes for Global Data
            
            # If cache is valid, use it as base
            base_data = None
            if current_time - self._smart_menu_last_update < CACHE_TTL:
                base_data = self._smart_menu_cache.get('GLOBAL')
            
            if not base_data:
                # RECOMPUTE GLOBAL DATA
                # Load Data
                menu_df = self.sheets_client.read_sheet("Menu")
                
                # Filter Active
                valid_status = ['active', '1', 'yes', 'true']
                menu_df["Is_Active"] = menu_df["Is_Active"].astype(str).str.strip().str.lower().isin(valid_status)
                active_df = menu_df[menu_df["Is_Active"]].copy()
                if active_df.empty: active_df = menu_df.copy() # Fallback
                
                # DEDUPLICATE BEFORE SELECTION: Ensure we work with unique names
                active_df = active_df.drop_duplicates(subset=['Item_Name'], keep='first')

                # Unified Global Data
                global_sections = {}
                
                # A. BESTSELLERS & CHEF SPECIAL (Need Order Stats)
                try:
                    order_items_df = self.sheets_client.read_sheet("Order_Items")
                    
                    # Bestsellers
                    bestseller_names = []
                    if not order_items_df.empty:
                        popular_names = order_items_df['Item_Name'].value_counts().head(6).index
                        bestsellers = active_df[active_df['Item_Name'].isin(popular_names)]
                        if not bestsellers.empty:
                            global_sections["Bestseller"] = [self._format_item_row(row) for _, row in bestsellers.iterrows()]
                            bestseller_names = bestsellers['Item_Name'].tolist()

                    # Chef Special (Exclude Bestsellers to avoid duplicates in UI)
                    chef_candidates = active_df[~active_df['Item_Name'].isin(bestseller_names)].copy()
                    if not chef_candidates.empty:
                        chef_candidates['Price_Float'] = pd.to_numeric(chef_candidates['Current_Price'], errors='coerce').fillna(0)
                        sorted_by_price = chef_candidates.sort_values(by='Price_Float', ascending=False)
                        # Pick top 8 unique premium items
                        chef_special = sorted_by_price.head(8)
                        if not chef_special.empty:
                            global_sections["Chef Special"] = [self._format_item_row(row) for _, row in chef_special.iterrows()]
                            # Add alias for frontend compatibility if needed
                            global_sections["Chef Recommendation"] = global_sections["Chef Special"]
                        
                except Exception as e:
                    print(f"Stats Error: {e}")

                # B. CATEGORIES
                categories = active_df['Item_Category'].unique()
                for category in sorted(categories):
                    if not category: continue
                    cat_items = active_df[active_df['Item_Category'] == category]
                    if not cat_items.empty:
                        global_sections[category] = [self._format_item_row(row) for _, row in cat_items.iterrows()]
                
                base_data = {
                    "menu_sections": global_sections,
                    "total_items": len(active_df),
                    "categories": list(global_sections.keys()),
                    "active_df": active_df # Keep DF for user personalization
                }
                
                # Update Cache
                self._smart_menu_cache['GLOBAL'] = base_data
                self._smart_menu_last_update = current_time
                print("⚡ Updated Menu Cache")

            # -------------------------------------------------
            # 2. Personalize for User (Favorites)
            # -------------------------------------------------
            final_sections = base_data["menu_sections"].copy()
            
            if email:
                try:
                    # Quick check for favorites
                    orders_df = self.sheets_client.read_sheet("Orders")
                    order_items_df = self.sheets_client.read_sheet("Order_Items")
                    active_df = base_data["active_df"]
                    
                    if not orders_df.empty and not order_items_df.empty:
                         matching_orders = orders_df[orders_df['Customer_ID'].str.contains(email.split('@')[0], case=False, na=False)]
                         if not matching_orders.empty:
                             past_items = order_items_df[order_items_df['Order_ID'].isin(matching_orders['Order_ID'])]['Item_Name'].unique()
                             fav_items = active_df[active_df['Item_Name'].isin(past_items)]
                             if not fav_items.empty:
                                 # Format favorites
                                 fav_list = [self._format_item_row(row) for _, row in fav_items.iterrows()]
                                 final_sections = {"Your Favorites": fav_list, **final_sections}
                except Exception as e:
                    print(f"Personalization Error: {e}")

            return {
                "status": "success",
                "menu_sections": final_sections,
                "total_items": base_data["total_items"],
                "categories": list(final_sections.keys())
            }

        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e), "menu_sections": {}}


# ---------------------------------------------------------
# Dependency: MenuAgent instance (Lazy Singleton)
# ---------------------------------------------------------
@lru_cache(maxsize=1)
def get_menu_agent_instance() -> MenuAgent:
    return MenuAgent()

def get_menu_agent() -> MenuAgent:
    return get_menu_agent_instance()


# ---------------------------------------------------------
# 🍽️ API Endpoints
# ---------------------------------------------------------
@menu_router.get("/complete")
def fetch_menu(agent: MenuAgent = Depends(get_menu_agent)):
    """
    Fetch full active menu (non-personalized)
    """
    return agent.get_menu()


@menu_router.get("/customized/{customer_id}")
def fetch_custom_menu(
    customer_id: str,
    agent: MenuAgent = Depends(get_menu_agent)
):
    """
    Fetch personalized menu for a customer (using insights)
    """
    return agent.get_customized_menu(customer_id)

@menu_router.post("")
def get_smart_menu(
    dataset: dict, 
    agent: MenuAgent = Depends(get_menu_agent)
):
    """
    Main Menu Endpoint - Returns Sections (Favorites, Bestsellers, Categories)
    """
    email = dataset.get("email") # Can be None
    return agent.get_smart_menu(email)

