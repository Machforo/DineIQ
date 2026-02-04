# DineIQ\Backend\agents\menu.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
import os
import json

# import agents and services classes
from services.sheets import SheetsClient
from services.llm import GeminiClient

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

        # Shape response for frontend
        return [
            {
                # "id": row["Item_ID"],
                "name": row["Item_Name"],
                # "category": row["Item_Category"],
                "price": float(row["Current_Price"]) if row["Current_Price"] != "" else None,
                # "active?": row["Is_Active"]
            }
            for _, row in df.iterrows()
        ]

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

            formatted_menu.append({
                "name": row.get("Item_Name", ""),
                "price": (
                    float(row["Current_Price"])
                    if row.get("Current_Price") not in (None, "")
                    else None
                ),
                "matching": matches if matches else None,
                "rank": int(_ + 1)  # 🔍 TEST ONLY — safe to remove

            })

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
        ranked_names = self.rank_menu_items_with_gemini(
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
    # 🤖 Gemini-based ranking (SAFE + INTERPRETIVE)
    # -------------------------------------------------------------------
    def rank_menu_items_with_gemini(
        self,
        menu_items: list[dict],
        customer_profile: dict
    ) -> list[str]:
        """
        Uses Gemini to:
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

        gemini_client = GeminiClient()
        response = gemini_client.call_gemini_with_retry(prompt)

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

    def get_menu_by_category(self, category: str) -> list:
        return []


# ---------------------------------------------------------
# Dependency: MenuAgent instance
# ---------------------------------------------------------
menu_agent = MenuAgent()

def get_menu_agent() -> MenuAgent:
    return menu_agent


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
    Fetch personalized menu for a customer
    """
    return agent.get_customized_menu(customer_id)

