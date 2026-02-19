import os
import traceback
import logging
from typing import List, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd

# Services
from services.sheets import SheetsClient
from services.llm import GeminiClient, GroqClient
from agents.menu import MenuAgent, get_menu_agent
import random
import json
import time
from collections import Counter

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
        self.groq_client = GroqClient()
        self.menu_agent = get_menu_agent()
        
        # 🍽️ STRATEGIC CATEGORY MAPPING: Defining logical pairs for cross-selling
        self.category_pairings = {
            'Bread': {'pairs_with': ['Gravy', 'DryVeg'], 'message': 'Perfect with curry!'},
            'Rice': {'pairs_with': ['Gravy', 'Dessert', 'Raita'], 'message': 'Complete your meal!'},
            'Gravy': {'pairs_with': ['Bread', 'Rice'], 'message': 'Best with bread or rice!'},
            'Starter': {'pairs_with': ['Beverages', 'Smoothies'], 'message': 'Pair with a refreshing drink!'},
            'Snacks': {'pairs_with': ['Beverages', 'Smoothies'], 'message': 'Great with a drink!'},
            'DryVeg': {'pairs_with': ['Bread', 'Rice'], 'message': 'Complete your meal!'},
            'Dessert': {'pairs_with': ['Beverages'], 'message': 'Sweet ending!'},
            'Beverages': {'pairs_with': ['Starter', 'Snacks', 'Dessert'], 'message': 'Refresh yourself!'}
        }

    # ---------------------------------------------------------
    # Core Logic
    # ---------------------------------------------------------
    def get_recommendations(self, email: str, current_item_id: str):
        """Advanced Hybrid Recommendations: History + Category Intelligence"""
        try:
            current_item_id = str(current_item_id).strip()
            
            # Optimization: Read full menu DF once for category lookups
            menu_df = self.sheets_client.read_sheet("Menu")
            
            # Consistent Data Cleaning: Strip spaces and normalize
            menu_df['Item_ID'] = menu_df['Item_ID'].astype(str).str.strip()
            menu_df['Is_Active'] = menu_df['Is_Active'].astype(str).str.upper().str.strip()
            
            item_match = menu_df[menu_df['Item_ID'] == current_item_id]
            
            if item_match.empty:
                return {"ai_pitch": "Explore our bestsellers!", "add_ons": self._get_popular_fallback(menu_df)}

            item = item_match.iloc[0]
            item_category = item['Item_Category']
            item_name = item['Item_Name']
            
            # User Preference fetch (Mapping user dietary needs)
            diet = self._get_user_dietary_pref(email)

            # Strategy 1: Logical Category Pairing
            pairing_info = self.category_pairings.get(item_category, {'pairs_with': ['Beverages']})
            pairing_recs = self._get_items_by_category_from_df(menu_df, pairing_info['pairs_with'], diet, current_item_id)

            # Strategy 2: Frequently Bought Together (Order History Analysis)
            history_recs = self._get_frequently_bought_together(current_item_id, diet, menu_df)
            
            # --- Unified Deduplication Logic ---
            final_recs = []
            seen_ids = {current_item_id}
            
            for rec in (history_recs + pairing_recs):
                if rec['id'] not in seen_ids:
                    final_recs.append(rec)
                    seen_ids.add(rec['id'])
                if len(final_recs) >= 3: 
                    break # Limit for UI

            # Fallback
            if not final_recs:
                final_recs = self._get_popular_fallback(menu_df, diet)[:3]

            # AI Pitch generation using Gemini
            ai_pitch = self._generate_ai_pitch(item_name, item_category, final_recs)

            return {"ai_pitch": ai_pitch, "add_ons": final_recs}
            
        except Exception as e:
            traceback.print_exc()
            return {"ai_pitch": "Pairs great with your meal!", "add_ons": []}

    def get_upsell_items(self):
        """Simple upsell getter - e.g. desserts or beverages"""
        try:
            menu_df = self.sheets_client.read_sheet("Menu")
            menu_df['Is_Active'] = menu_df['Is_Active'].astype(str).str.upper().str.strip()
            
            # Filter for 'Dessert' or 'Beverages'
            upsell_df = menu_df[menu_df['Item_Category'].isin(['Dessert', 'Beverages'])]
            upsell_df = upsell_df[upsell_df['Is_Active'] == 'ACTIVE']
            
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
            self.sheets_client.append_row("Customer_Preferences", new_row)
            
            return {"status": "success", "message": "Preferences saved successfully"}
            
        except Exception as e:
            print(f"!!! Error saving preferences: {e}")
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

    def generate_combos(self, num_combos: int = 3, email: str = None) -> List[Dict]:
        """🤖 SUPER AI COMBO GENERATOR - Powered by Gemini with Deep Customer Intelligence"""
        try:
            # -------------------------------------------------
            # CACHE CHECK
            # -------------------------------------------------
            if not hasattr(self, '_combo_cache'):
                self._combo_cache = {}
            
            cache_key = f"{email}_{num_combos}"
            current_time = pd.Timestamp.now().timestamp()
            CACHE_TTL = 900  # 15 Minutes Cache for AI Combos
            
            if cache_key in self._combo_cache:
                data, timestamp = self._combo_cache[cache_key]
                if current_time - timestamp < CACHE_TTL:
                    # print(f"🚀 Using Cached AI Combos for {email}")
                    return data
            
            # -------------------------------------------------
            # GENERATE NEW
            # -------------------------------------------------
            print(f"🚀 Generating {num_combos} Super AI Combos for {email or 'guest'}")
            
            # Step 1: Load all necessary data
            menu_df = self.sheets_client.read_sheet("Menu")
            
            # Consistent Data Cleaning
            menu_df['Item_ID'] = menu_df['Item_ID'].astype(str).str.strip()
            menu_df['Is_Active'] = menu_df['Is_Active'].astype(str).str.upper().str.strip()
            
            # Filter Active items
            active_items = menu_df[menu_df['Is_Active'] == 'ACTIVE'].copy()
            
            if active_items.empty:
                print("❌ No active items found")
                return []

            # Step 2: Gather Customer Intelligence
            customer_insights = self._gather_customer_insights(email) if email else {}
            
            print(f"📊 Customer Insights: {customer_insights}")

            # Step 3: Filter menu based on dietary preferences
            diet = customer_insights.get('dietary_preference', 'General')
            
            if diet in ["Pure Veg", "Vegetarian"]:
                active_items = active_items[~active_items['Item_Name'].str.contains(
                    'Chicken|Egg|Meat|Fish|Mutton', case=False, na=False
                )]
                print(f"🌱 Filtered for {diet} diet")

            # Step 4: Use Groq AI to generate intelligent combos
            ai_combos = self._generate_ai_super_combos(
                active_items=active_items,
                customer_insights=customer_insights,
                num_combos=num_combos
            )

            print(f"✅ Generated {len(ai_combos)} combos")
            result = ai_combos[:num_combos]
            
            # UPDATE CACHE
            self._combo_cache[cache_key] = (result, current_time)
            
            return result

        except Exception as e:
            print(f"❌ Combo Generation Error: {e}")
            traceback.print_exc()
            return []

    def _gather_customer_insights(self, email: str) -> Dict:
        """🧠 Deep Customer Intelligence Gathering"""
        
        # -------------------------------------------------
        # CACHE CHECK
        # -------------------------------------------------
        if not hasattr(self, '_insights_cache'):
            self._insights_cache = {}
            
        current_time = pd.Timestamp.now().timestamp()
        CACHE_TTL = 600  # 10 Minutes Cache for Insights
        
        if email in self._insights_cache:
            data, timestamp = self._insights_cache[email]
            if current_time - timestamp < CACHE_TTL:
                # print(f"🚀 Using Cached Insights for {email}")
                return data

        insights = {
            'dietary_preference': 'General',
            'favorite_items': [],
            'preferred_categories': [],
            'preferred_bread': None,
            'preferred_beverage': None,
            'preferred_dessert': None,
            'order_frequency': 'New Customer',
            'average_order_value': 0,
            'favorite_combos': [],
            'time_preferences': 'Lunch'
        }
        
        try:
            # 1. Get Customer Preferences & Insights
            try:
                # A. Check Customer_Preferences Sheet (Explicit preferences)
                prefs_df = self.sheets_client.read_sheet("Customer_Preferences")
                if not prefs_df.empty and 'Email' in prefs_df.columns:
                    user_prefs = prefs_df[prefs_df['Email'] == email]
                    if not user_prefs.empty:
                        latest_pref = user_prefs.iloc[-1]
                        insights['dietary_preference'] = latest_pref.get('Dietary', 'General')
                        insights['preferred_bread'] = latest_pref.get('Preferred_Bread', None)
                        insights['preferred_beverage'] = latest_pref.get('Favorite_Beverage', None)
                        insights['preferred_dessert'] = latest_pref.get('Dessert_Preference', None)
                        print(f"✅ Found customer preferences")

                # B. Check Customer_Auth Sheet (For 'Customer_Insights' column)
                auth_df = self.sheets_client.read_sheet("Customer_Auth")
                if not auth_df.empty and 'Customer_Email' in auth_df.columns:
                    user_auth = auth_df[auth_df['Customer_Email'] == email]
                    if not user_auth.empty:
                        auth_row = user_auth.iloc[-1]
                        # Look for 'Customer_Insights' or 'Computed_Insights'
                        if 'Customer_Insights' in auth_row and pd.notna(auth_row['Customer_Insights']):
                            insights['manual_insights'] = auth_row['Customer_Insights']
                            print(f"✅ Found Manual Customer Insights: {insights['manual_insights']}")
                        elif 'Insights' in auth_row and pd.notna(auth_row['Insights']):
                            insights['manual_insights'] = auth_row['Insights']
                            print(f"✅ Found Manual Insights: {insights['manual_insights']}")
                            
            except Exception as e:
                print(f"⚠️ Could not load preferences/insights: {e}")

            # 2. Analyze Order History
            try:
                orders_df = self.sheets_client.read_sheet("Orders")
                order_items_df = self.sheets_client.read_sheet("Order_Items")
                menu_df = self.sheets_client.read_sheet("Menu")
                
                # Check required columns before processing
                if not orders_df.empty and 'Customer_Email' in orders_df.columns:
                    # Clean data
                    orders_df['Customer_Email'] = orders_df['Customer_Email'].astype(str).str.strip()
                    if not order_items_df.empty: order_items_df['Item_ID'] = order_items_df['Item_ID'].astype(str).str.strip()
                    menu_df['Item_ID'] = menu_df['Item_ID'].astype(str).str.strip()
                    
                    # Get user's orders
                    user_orders = orders_df[orders_df['Customer_Email'] == email]
                    
                    if not user_orders.empty:
                        # Order frequency
                        num_orders = len(user_orders)
                        if num_orders >= 10:
                            insights['order_frequency'] = 'Loyal Customer'
                        elif num_orders >= 5:
                            insights['order_frequency'] = 'Regular Customer'
                        else:
                            insights['order_frequency'] = 'Occasional Customer'
                        
                        # Average order value
                        if 'Total_Amount' in user_orders.columns:
                            insights['average_order_value'] = pd.to_numeric(user_orders['Total_Amount'], errors='coerce').mean()
                        
                        # Get items from user's orders
                        if not order_items_df.empty:
                            order_ids = user_orders['Order_ID'].tolist()
                            user_items = order_items_df[order_items_df['Order_ID'].isin(order_ids)]
                            
                            if not user_items.empty:
                                # Most ordered items
                                item_counts = user_items['Item_ID'].value_counts().head(5)
                                favorite_item_ids = item_counts.index.tolist()
                                
                                # Get item details
                                favorite_items = menu_df[menu_df['Item_ID'].isin(favorite_item_ids)]
                                insights['favorite_items'] = favorite_items['Item_Name'].tolist()
                                
                                # Preferred categories
                                if not favorite_items.empty:
                                    category_counts = favorite_items['Item_Category'].value_counts()
                                    insights['preferred_categories'] = category_counts.head(3).index.tolist()
                                
                                print(f"✅ Analyzed {num_orders} orders, {len(user_items)} items")
            
            except Exception as e:
                print(f"⚠️ Could not analyze order history: {e}")

            # 3. Global Combo Patterns (what combinations are popular across all users)
            try:
                order_items_df = self.sheets_client.read_sheet("Order_Items")
                
                if not order_items_df.empty:
                    # Find orders with multiple items (potential combos)
                    order_item_counts = order_items_df.groupby('Order_ID').size()
                    combo_orders = order_item_counts[order_item_counts >= 2].index.tolist()
                    
                    # Analyze popular combinations
                    popular_combos = []
                    for order_id in combo_orders[:20]:  # Sample top 20 combo orders
                        items_in_order = order_items_df[order_items_df['Order_ID'] == order_id]['Item_ID'].tolist()
                        if len(items_in_order) >= 2:
                            popular_combos.append(tuple(sorted(items_in_order)))
                    
                    # Get most common combos
                    combo_freq = Counter(popular_combos)
                    insights['favorite_combos'] = [list(combo) for combo, _ in combo_freq.most_common(3)]
                    
                    print(f"✅ Analyzed {len(popular_combos)} popular combos")
                
            except Exception as e:
                print(f"⚠️ Could not analyze combo patterns: {e}")
                
            # UPDATE CACHE
            self._insights_cache[email] = (insights, current_time)

        except Exception as e:
            print(f"❌ Error gathering customer insights: {e}")
            traceback.print_exc()
        
        return insights

    def _generate_ai_super_combos(self, active_items, customer_insights: Dict, num_combos: int) -> List[Dict]:
        """🎯 Use Groq AI to create personalized, intelligent combos"""
        try:
            # Prepare menu context for Gemini
            menu_sample = active_items[['Item_Name', 'Item_Category', 'Current_Price']].head(50).to_dict('records')
            
            # Build intelligent prompt with customer insights
            prompt = f"""
You are an expert Indian restaurant combo designer. Create {num_combos} personalized combo meals.

CUSTOMER INTELLIGENCE:
- Dietary Preference: {customer_insights.get('dietary_preference', 'General')}
- Order Frequency: {customer_insights.get('order_frequency', 'New Customer')}
- Favorite Items: {', '.join(customer_insights.get('favorite_items', [])[:5]) or 'None yet'}
- Preferred Categories: {', '.join(customer_insights.get('preferred_categories', [])) or 'All'}
- Preferred Bread: {customer_insights.get('preferred_bread') or 'Any'}
- Preferred Beverage: {customer_insights.get('preferred_beverage') or 'Any'}
- Preferred Dessert: {customer_insights.get('preferred_dessert') or 'Any'}
- Average Order Value: ₹{customer_insights.get('average_order_value', 0):.0f}
- SPECIAL CUSTOMER INSIGHTS: {customer_insights.get('manual_insights', 'None provided')}

AVAILABLE MENU ITEMS:
{json.dumps(menu_sample, indent=2)}

COMBO DESIGN RULES:
1. Each combo must have 3-5 items (main course, sides, beverage/dessert)
2. Include realistic quantities (e.g., 2 rotis per person, not 10)
3. Balance categories: must include Main Course + Bread/Rice + Side/Accompaniment
4. Consider customer's favorite items and categories
5. Respect dietary preferences strictly
6. Price combos between ₹{customer_insights.get('average_order_value', 200):.0f} and ₹{customer_insights.get('average_order_value', 200) * 1.5:.0f} before discount
7. Create variety - don't repeat the same pattern
8. If customer has preferred bread/beverage/dessert, include them when appropriate

PERSONALIZATION STRATEGY:
- For "Loyal Customer": Include their top favorites with premium upgrades
- For "Regular Customer": Mix favorites with new discoveries
- For "New/Occasional Customer": Showcase popular best-sellers
- For "Pure Veg/Vegetarian": Only vegetarian items, no eggs/chicken/meat

Return ONLY a valid JSON array with this exact structure:
[
  {{
    "name": "Catchy 3-4 word combo name",
    "items": [
      {{"item_name": "Exact Item Name from menu", "quantity": 1}},
      {{"item_name": "Exact Item Name from menu", "quantity": 2}}
    ],
    "insight": "Why this combo is perfect for this customer (mention personalization)",
    "personalization_score": 95
  }}
]

CRITICAL: 
- Use EXACT item names from the menu provided
- Quantities should be realistic (1-2 for mains, 2-4 for breads, 1 for beverages)
- Ensure variety across combos
- NO markdown, NO explanations, ONLY the JSON array
"""

            print("🎯 Sending request to Groq...")
            response = self.groq_client.call_groq_with_retry(prompt)
            
            if not response:
                print("❌ Empty response from Gemini")
                return []
            
            # Clean and parse response
            response = response.replace("```json", "").replace("```", "").strip()
            
            # Find JSON array
            if "[" in response and "]" in response:
                start_idx = response.find("[")
                end_idx = response.rfind("]") + 1
                json_str = response[start_idx:end_idx]
                
                print(f"📝 Gemini Response (first 500 chars): {json_str[:500]}")
                
                try:
                    combo_data = json.loads(json_str)
                except json.JSONDecodeError as e:
                    print(f"❌ JSON Parse Error: {e}")
                    print(f"Raw response: {response}")
                    return []
                
                # Process each combo
                processed_combos = []
                
                for deal in combo_data:
                    try:
                        # Match items to menu and validate
                        combo_items = []
                        
                        for item_obj in deal.get("items", []):
                            if isinstance(item_obj, dict):
                                item_name = item_obj.get("item_name", "")
                                quantity = item_obj.get("quantity", 1)
                            else:
                                item_name = item_obj
                                quantity = 1
                            
                            # Find exact or close match
                            match = active_items[
                                active_items['Item_Name'].str.lower() == item_name.lower()
                            ]
                            
                            # If no exact match, try contains
                            if match.empty:
                                match = active_items[
                                    active_items['Item_Name'].str.contains(item_name, case=False, regex=False, na=False)
                                ]
                            
                            if not match.empty:
                                item_dict = match.iloc[0].to_dict()
                                item_dict['quantity'] = max(1, min(quantity, 5))  # Limit quantity 1-5
                                combo_items.append(item_dict)
                            else:
                                print(f"⚠️ Item not found in menu: {item_name}")
                        
                        # Only create combo if we matched at least 2 items
                        if len(combo_items) >= 2:
                            # Calculate discount based on personalization
                            personalization_score = deal.get('personalization_score', 50)
                            discount = 5 + int(personalization_score / 20)  # 5-10% based on personalization
                            discount = min(discount, 15)  # Cap at 15%
                            
                            combo_obj = self._create_combo_object(
                                name=deal.get("name", "DineIQ Special Combo"),
                                items=combo_items,
                                discount_percent=discount,
                                insight=deal.get("insight", "Handpicked for you based on your preferences")
                            )
                            
                            # Add personalization metadata
                            combo_obj['personalization_score'] = personalization_score
                            combo_obj['customer_type'] = customer_insights.get('order_frequency', 'New Customer')
                            
                            processed_combos.append(combo_obj)
                            print(f"✅ Created combo: {combo_obj['Item_Name']}")
                        else:
                            print(f"⚠️ Skipping combo - insufficient items matched")
                            
                    except Exception as e:
                        print(f"⚠️ Error processing combo: {e}")
                        continue
                
                return processed_combos
            
            else:
                print("❌ No JSON array found in response")
                return []
                
        except Exception as e:
            print(f"❌ Gemini Super Combo Error: {e}")
            traceback.print_exc()
            return []

    def _create_combo_object(self, name: str, items: List[Dict], discount_percent: int, insight: str):
        """Create combo object with formatted item description including quantities"""
        # Calculate total price considering quantities
        total = sum(float(item['Current_Price']) * item.get('quantity', 1) for item in items)
        price = round(total * (1 - discount_percent/100), 2)
        savings = round(total - price, 2)
        
        # Format description with quantities: "1 Butter Chicken + 2 Naan + 1 Rice"
        item_descriptions = []
        for item in items:
            qty = item.get('quantity', 1)
            item_name = item['Item_Name']
            item_descriptions.append(f"{qty} {item_name}")
        
        # Join with " + " separator
        description = " + ".join(item_descriptions)
        
        # Format items for frontend (matches AIComboCard interface)
        formatted_items = []
        for item in items:
            formatted_items.append({
                "name": item['Item_Name'],
                "quantity": item.get('quantity', 1),
                "price": float(item['Current_Price']),
                "category": item.get('Item_Category', 'General')
            })

        return {
            "Item_ID": f"combo_{random.randint(1000, 9999)}",
            "Item_Name": name,
            "Item_Description": description,  # e.g., "1 Butter Chicken + 2 Naan + 1 Rice"
            "Items": formatted_items, # <--- Added this for better UI rendering
            "Current_Price": price,
            "Original_Price": total,
            "Discount_Percent": discount_percent,
            "Savings": savings,
            "Is_Personalized": True,
            "Insight": insight,
            "Image_URL": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"
        }

    def get_offers(self):
        """Returns Tiered Discounts AND Campaign Offers"""
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
                    "bgColor": "#FF5722",
                    "image": "",
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
                    "bgColor": "#E23744",
                    "image": "",
                    "type": "campaign"
                }
            ]
        }

    # ---------------------------------------------------------
    # Helper Methods
    # ---------------------------------------------------------

    def _get_user_dietary_pref(self, email: str):
        """Fetch user dietary preference from Customer_Preferences or Customer_Auth"""
        try:
            prefs_df = self.sheets_client.read_sheet("Customer_Preferences")
            user_row = prefs_df[prefs_df['Email'] == email]
            
            if not user_row.empty:
                return user_row.iloc[-1].get('Dietary', 'General')
            
            # Fallback to auth table
            auth_rows = self.sheets_client.read_sheet_rows("Customer_Auth")
            user = next((r for r in auth_rows if r.get("Customer_Email") == email), None)
            
            if user:
                return user.get('Dietary_Preference', 'General')
                
        except:
            pass
        
        return "General"

    def _get_items_by_category_from_df(self, df, categories, diet, exclude_id):
        """Get items by category with dietary filtering"""
        mask = (df['Item_Category'].isin(categories)) & (df['Is_Active'] == 'ACTIVE')
        
        if exclude_id:
            mask &= (df['Item_ID'] != exclude_id)
        
        items = df[mask].copy()
        
        # Strict Veg Filter
        if diet in ["Pure Veg", "Vegetarian"]:
            items = items[~items['Item_Name'].str.contains(
                'Chicken|Egg|Meat|Fish|Mutton', case=False, na=False
            )]
        
        return [
            {
                "id": row['Item_ID'],
                "name": row['Item_Name'],
                "price": float(row['Current_Price']),
                "category": row['Item_Category']
            }
            for _, row in items.head(3).iterrows()
        ]

    def _get_frequently_bought_together(self, item_id: str, diet: str, menu_df):
        """Get items frequently bought together based on order history"""
        try:
            order_items_df = self.sheets_client.read_sheet("Order_Items")
            order_items_df['Item_ID'] = order_items_df['Item_ID'].astype(str).str.strip()
            
            # Find orders containing this item
            order_ids = order_items_df[order_items_df['Item_ID'] == item_id]['Order_ID'].unique()
            
            # Find other items in those orders
            other_items = order_items_df[
                (order_items_df['Order_ID'].isin(order_ids)) & 
                (order_items_df['Item_ID'] != item_id)
            ]
            
            # Get top 2 most frequent items
            top_item_ids = other_items['Item_ID'].value_counts().head(2).index.tolist()
            
            return self._format_items_list(top_item_ids, diet, menu_df, "Often added together")
            
        except:
            return []

    def _format_items_list(self, item_ids, diet, menu_df, tag=""):
        """Format list of item IDs into recommendation objects"""
        active_menu = menu_df[menu_df['Is_Active'] == 'ACTIVE']
        result = []
        
        for item_id in item_ids:
            match = active_menu[active_menu['Item_ID'] == item_id]
            
            if not match.empty:
                row = match.iloc[0]
                
                # Apply dietary filter
                if diet in ["Pure Veg", "Vegetarian"]:
                    if any(word in row['Item_Name'].upper() for word in ['CHICKEN', 'EGG', 'MEAT', 'FISH', 'MUTTON']):
                        continue
                
                result.append({
                    "id": row['Item_ID'],
                    "name": row['Item_Name'],
                    "price": float(row['Current_Price']),
                    "tag": tag
                })
        
        return result

    def _get_popular_fallback(self, menu_df, diet="General"):
        """Get popular items as fallback recommendations"""
        try:
            order_items_df = self.sheets_client.read_sheet("Order_Items")
            order_items_df['Item_ID'] = order_items_df['Item_ID'].astype(str).str.strip()
            
            popular_ids = order_items_df['Item_ID'].value_counts().head(5).index.tolist()
            return self._format_items_list(popular_ids, diet, menu_df, "Bestseller")
            
        except:
            # Ultimate fallback - just return first 3 active items
            active = menu_df[menu_df['Is_Active'] == 'ACTIVE']
            return [
                {
                    "id": row['Item_ID'],
                    "name": row['Item_Name'],
                    "price": float(row['Current_Price'])
                }
                for _, row in active.head(3).iterrows()
            ]

    def _generate_ai_pitch(self, item_name: str, category: str, recommendations: List[Dict]):
        """Generate AI-powered pitch for recommendations using Gemini"""
        if not recommendations:
            return "Make it a feast with these!"
        
        try:
            rec_name = recommendations[0]['name']
            prompt = f"Write a 1-line appetizing pitch for adding {rec_name} to {item_name} ({category}). Max 12 words. Be creative and enticing."
            
            response = self.groq_client.call_groq_with_retry(prompt)
            
            if response:
                return response.strip().replace('"', '').replace('*', '')
            
        except Exception as e:
            print(f"AI Pitch Error: {e}")
        
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
    """Get smart add-on recommendations for an item"""
    return recommendation_agent.get_recommendations(req.customer_email, req.item_id)

@recommendation_router.get("/upsell-items")
def get_upsell_items():
    """Get upsell items (desserts & beverages)"""
    return recommendation_agent.get_upsell_items()

@recommendation_router.post("/save-preferences")
def save_preferences(req: PreferencesRequest):
    """Save customer preferences"""
    return recommendation_agent.save_user_preference(req.email, req.preferences)

@recommendation_router.post("/generate-combos")
def generate_combos(req: ComboRequest):
    """🚀 Generate Super AI-powered combo deals with deep personalization"""
    return {"combos": recommendation_agent.generate_combos(req.num_combos, req.email)}

@recommendation_router.get("/offers")
def get_offers():
    """Get available offers and campaigns"""
    return recommendation_agent.get_offers()