# DineIQ\Backend\agents\categorization.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
import os
import re
import time
import json
import pandas as pd

from config import BATCH_SIZE, REQUEST_DELAY

# -------------------------------------------------------------------
# 🔧 SETUP KEYS and URLs
# -------------------------------------------------------------------
from dotenv import load_dotenv

load_dotenv()

from services.sheets import SheetsClient
sheets_client = SheetsClient(spreadsheet_id=os.getenv("SPREADSHEET_ID"))

from services.llm import GeminiClient
gemini_client = GeminiClient()

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "").strip()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()

CUSTOMER_AUTH_SHEET     = "Customer_Auth"       # Read-Write from Customer Frontend Web/App
ORDERS_SHEET            = "Orders"              # Writable from Customer Frontend Web/App, Partially Updated with AI/Automation
ORDER_ITEMS_SHEET       = "Order_Items"         # Writable from Customer Frontend Web/App
CHATS_SHEET             = "Chats"               # Writable from Customer-AI Frontend Chatbot

# -------------------------------------------------------------------
# 🧩 CLIENT ENRICHMENT
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# 🧩 Infer Customer category based on dietary preferences
# Vegetarian | Non-Vegetarian | Vegan | Jain | Eggetarian
# -------------------------------------------------------------------
def infer_dietary(model, order_items):
    # if no order items, return None
    if order_items.empty:
        print("dietary: orders empty")
        return None

    items = order_items["Item_Name"].astype(str).tolist()

    # Check GEMINI_API_KEY and GEMINI_MODEL
    # if not GEMINI_API_KEY or not GEMINI_MODEL:
    #     return None
    
    # Fetch gemini api key
    # import google.generativeai as genai
    # genai.configure(api_key=GEMINI_API_KEY)
    
    dietary_prompt = f"""
    You are classifying a customer's dietary preference.

    Dietary categories:
    - Vegetarian: No meat, fish, or eggs. Dairy allowed.
    - Eggetarian: Eggs allowed, no meat or fish.
    - Non-Vegetarian: Meat or fish present.
    - Vegan: No animal products at all.
    - Jain: No root vegetables (onion, garlic, potato), no meat, no eggs.

    Rules:
    - Infer the dominant dietary preference based on the ordered items.
    - If multiple categories are present, choose the one that best represents the overall order.
    - If no clear category dominates, return null.
    - Return ONLY one of the category names or null.

    Ordered items:
    {items}
    """
    
    # fetch gemini model and generate response
    try:
        response = model.generate_content(dietary_prompt)
        result = response.text.strip().lower()
    except Exception as e:
        print("dietary: exception -> ", repr(e))
        return None
        # msg = str(e).lower()

        # if "quota" in msg or "resourceexhausted" in msg:
        #     print("⏳ Quota hit — sleeping for 35 seconds...")
        #     time.sleep(35)

        #     # retry ONCE
        #     try:
        #         response = model.generate_content(dietary_prompt)
        #         result = response.text.strip().lower()
        #     except Exception as e2:
        #         print("❌ Retry failed:", e2)
        #         return None
        # else:
        #     print("❌ dietary error:", e)
        #     return None

    
    # normalize and map to canonical allowed dietary category
    NORMALIZED = {
        "vegetarian": "Vegetarian",
        "eggetarian": "Eggetarian",
        "non-vegetarian": "Non-Vegetarian",
        "non vegetarian": "Non-Vegetarian",
        "vegan": "Vegan",
        "jain": "Jain",
        "null": None
    }

    # Validate result with allowed dietary categories
    for key in NORMALIZED:
        if key in result:
            print("dietary: ", result)
            return NORMALIZED[key]
    # If not found in NORMALISED, return None
    print("dietary: not in NORMALISED")
    return None

# -------------------------------------------------------------------
# 🧩 Infer Customer avg order value based on orders history
# Low Spender       : Average order value under 300
# Mid Spender       : Average order value from 300 to 599
# High Spender      : Average order value from 600 to 999
# Premium Spender   : Average order value equal to or above 1000
# -------------------------------------------------------------------
AOV_BUCKETS = [
    (0, 299, "Low Spender"),
    (300, 599, "Mid Spender"),
    (600, 999, "High Spender"),
    (1000, float("inf"), "Premium Spender")
]

def infer_aov(orders):
    if orders.empty:
        print("aov: orders empty")
        return None

    # compute average order value from the orders
    avg = pd.to_numeric(orders["Order_Price"], errors="coerce").mean()

    # Handle empty avg value
    if pd.isna(avg):
        print("aov: Nan")
        return None
    
    # Fine the right aov range
    for low, high, label in AOV_BUCKETS:
        if low <= avg <= high:
            print("aov: ", avg)
            return label

    print("aov: not in AOV_BUCKETS")
    return None

# -------------------------------------------------------------------
# 🧩 Infer Customer avg order value based on visits in last 30 days
# Occasional    : Upto 1 visit
# Regular       : between 1 upto 4 visits
# Frequent      : between 4 upto 8 visits
# Loyal         : more than 8 visits
# -------------------------------------------------------------------
def infer_frequency(orders):
    if orders.empty:
        print("frequency: orders empty")
        return None

    # Convert order dates to datetime
    dates_range = pd.to_datetime(
        orders["Order_Created_DateTime"],
        errors="coerce",
        format="mixed",
    )

    # Handle all NaT dates
    if dates_range.dropna().empty:
        print("frequency: dates Nan")
        return None

    # Compute recent order count (last 30 days)
    cutoff = pd.Timestamp.now() - pd.Timedelta(days=30)
    # number of orders in that period
    count = (dates_range >= cutoff).sum()

    # assign frequency bucket
    if count <= 1:
        print("frequency: ","Occasional")
        return "Occasional"
    elif count <= 4:
        print("frequency: ","Regular")
        return "Regular"
    elif count <= 8:
        print("frequency: ","Frequent")
        return "Frequent"
    else:
        print("frequency: ","Loyal")
        return "Loyal"

# -------------------------------------------------------------------
# 🧩 Infer Customer ordering attitude based on orders and aov
# Refund-Prone      : 30% cancelled or refunded orders out of total orders
# Quality-Seeker    : Average order value >= 600
# Value-Seeker      : Default case
# -------------------------------------------------------------------
def infer_attitude(orders):
    if orders.empty:
        print("attitude: orders empty")
        return None

    # Compute total orders
    total = len(orders)
    
    # Compute cancelled/refunded orders
    cancelled = orders[
        orders["Order_Status"]
        .astype(str)
        .str.lower()
        .isin(["cancelled", "refunded"])
    ]

    # Determine if Refund-Prone
    if total > 0 and len(cancelled) / total >= 0.3:
        print("attitude: ","Refund-Prone")
        return "Refund-Prone"

    # Determine if “Quality-Seeker”
    avg = pd.to_numeric(orders["Order_Price"], errors="coerce").mean()
    # Handle nan values
    if pd.notna(avg) and avg >= 600:
        print("attitude: ","Quality-Seeker")
        return "Quality-Seeker"

    # Default Value-Seeker
    print("attitude: ","Value-Seeker")
    return "Value-Seeker"

# -------------------------------------------------------------------
# 🧩 Infer Customer on Dietary, Attitude and Favorite Items based on Chat
# Dietary   : "Vegetarian", "Non-Vegetarian", "Vegan", "Eggetarian", "Jain"
# Attitude  : "Value-Seeker", "Quality-Seeker", "Coupon-Driven", "Refund-Prone"
# Favorite Food Items: A list of 1-2 items in chat
# -------------------------------------------------------------------
ALLOWED_DIETARY = {"Vegetarian", "Non-Vegetarian", "Vegan", "Eggetarian", "Jain"}
ALLOWED_ATTITUDE = {"Value-Seeker", "Quality-Seeker", "Coupon-Driven", "Refund-Prone"}

def infer_from_chat_llm(model, chat_text):
    chat_prompt = f"""
You are classifying a restaurant customer based ONLY on chat text.

Choose values STRICTLY from the allowed categories below.
If a category cannot be inferred confidently, return null.

Dietary_Preferences (choose one): {list(ALLOWED_DIETARY)}
Order_Attitude_Categories (choose one): {list(ALLOWED_ATTITUDE)}
Favorite_Food_Items: Extract 1–2 food items explicitly mentioned in chat.

Chat Text:
{chat_text}

Output STRICT JSON only:
{{
  "dietary": null | "<one of allowed values>",
  "attitude": null | "<one of allowed values>",
  "favorite_food_items": []
}}
"""
    
    # fetch gemini model and generate response
    try:
        response = model.generate_content(chat_prompt)
        result_text = response.text.strip()
        result_json = json.loads(result_text)
    except Exception as e:
        print("chat: exception -> ", repr(e))
        return {"dietary": None, "attitude": None, "favorite_food_items": []}
        # msg = str(e).lower()

        # if "quota" in msg or "resourceexhausted" in msg:
        #     print("⏳ Chat quota hit — sleeping for 35 seconds...")
        #     time.sleep(35)

        #     try:
        #         response = model.generate_content(chat_prompt)
        #         result_text = response.text.strip()
        #         result_json = json.loads(result_text)
        #     except Exception as e2:
        #         print("❌ Chat retry failed:", e2)
        #         return {"dietary": None, "attitude": None, "favorite_food_items": []}
        # else:
        #     print("❌ Chat error:", e)
        #     return {"dietary": None, "attitude": None, "favorite_food_items": []}


    # Validate and normalize
    dietary = result_json.get("dietary")
    attitude = result_json.get("attitude")
    items = result_json.get("favorite_food_items", [])

    dietary = dietary if dietary in ALLOWED_DIETARY else None
    attitude = attitude if attitude in ALLOWED_ATTITUDE else None
    if not isinstance(items, list):
        items = []

    # return with all categories
    print (
        "chat: ",
        "dietary: ", dietary,
        "attitude: ", attitude,
        "favorite_food_items: ", items
    )
    return {
        "dietary": dietary,
        "attitude": attitude,
        "favorite_food_items": items
    }

def infer_customer_category(model, chat_row, orders, order_items):
    chat_text = str(chat_row.get("Chat_Session_Text", "")).strip()
    if not chat_text:
        print("customer: no chat")
        return ""

    # Fetch clean Customer_ID from Chat Row (without spaces etc)
    customer_id = str(chat_row.get("Customer_ID", "")).strip()
    if not customer_id:
        print("customer: no id")
        return ""

    # Fetch orders for the customer
    orders = orders[orders["Customer_ID"] == customer_id].copy()
    if orders.empty:
        order_items = order_items.iloc[0:0]  # empty df
    else:
        # Fetch order IDs for the customer
        order_ids = orders["Order_ID"]
        # Fetch order items for those order IDs
        order_items = order_items[order_items["Order_ID"].isin(order_ids)].copy()

    # Compute order-based insights
    order_insights = {
        "dietary": infer_dietary(model, order_items),
        "aov": infer_aov(orders),
        "frequency": infer_frequency(orders),
        "attitude": infer_attitude(orders)
    }

    time.sleep(30)

    # Compute chat-based insights
    chat_insights = infer_from_chat_llm(model, chat_text)

    # merge all insights (orders > chat)
    final = [
        order_insights["dietary"] or chat_insights.get("dietary"),
        order_insights["aov"],
        order_insights["frequency"],
        order_insights["attitude"] or chat_insights.get("attitude")
        # chat_insights.get("favorite_food_items", [])
    ]

    return ", ".join(v for v in final if v)


# -------------------------------------------------------------------
# 🚀 MAIN PROCESS
# -------------------------------------------------------------------
def categorize_customers():
    """
    Processes customer chat data and campaign details using Gemini LLM.
    Adds:
    1. Smart change detection (writes only if new/changed data)
    2. Skips reprocessing already analyzed customers
    """

    print("#" * 100)
    print("📢 Customers Processing started ...")

    # Initialize LLM instance
    gemini_llm = gemini_client.init_gemini()
    print("\n✅ Initialized Gemini instances: ", gemini_llm)

    # === STEP 1: Read Customers & Chats sheets ===
    # df_customers = read_sheet(sheets, CUSTOMER_AUTH_SHEET)
    df_chats = sheets_client.read_sheet(CHATS_SHEET)
    df_orders = sheets_client.read_sheet(ORDERS_SHEET)
    df_order_items = sheets_client.read_sheet(ORDER_ITEMS_SHEET)

    # Ensure required column exists in Chats sheet
    if "Customer_Chat_Category" not in df_chats.columns:
        df_chats["Customer_Chat_Category"] = ""

    total_chats = len(df_chats)
    print(f"\n🧾 Found {total_chats} chat records in '{CHATS_SHEET}'.")

    # === STEP 2: Analyze chats & categorize customers ===
    for start in range(0, total_chats, BATCH_SIZE):
        batch = df_chats.iloc[start:start + BATCH_SIZE]
        print(f"\n🔹 Processing batch {start // BATCH_SIZE + 1} ({len(batch)} chats)...")

        for idx, row in batch.iterrows():
            chat_id = row.get("Chat_ID", f"CHAT{idx+1}")
            chat_text = str(row.get("Chat_Session_Text", "")).strip()

            if not chat_text:
                continue

            # Skip if already categorized
            if row.get("Customer_Chat_Category", "").strip():
                continue

            print(f"\n🔍 Analyzing chat {chat_id} ...")

            # === Infer customer category ===
            category = infer_customer_category(
            gemini_llm,
            row,
            df_orders,
            df_order_items
            )

            # need to move this in Customer_Auth instead of presently in Chats
            df_chats.at[idx, "Customer_Chat_Category"] = category
            print(f"🏷️ Chat {chat_id} categorized as '{category}'")

            # time.sleep(REQUEST_DELAY)
            time.sleep(30)

        # === Smart update detection for Chats sheet ===
        print("\n🔍 Checking for updates in Chats sheet...")
        existing_chats = sheets_client.read_sheet(CHATS_SHEET)

        has_changes = False
        if not existing_chats.empty and "Customer_Chat_Category" in existing_chats.columns:
            old_vals = existing_chats["Customer_Chat_Category"].astype(str).fillna("").tolist()
            new_vals = df_chats["Customer_Chat_Category"].astype(str).fillna("").tolist()
            has_changes = old_vals != new_vals

        if has_changes:
            print("💾 Changes found — updating Chats sheet...")
            sheets_client.update_sheet(
                CHATS_SHEET,
                df_chats,
                columns_to_update=["Customer_Chat_Category"]
            )
            print("\n✅ Chats sheet updated successfully.")
        else:
            print("\n✅ No new chat updates — skipping Chats sheet write.")

    print("#" * 100)
    
# -------------------------------------------------------------------
# ▶️ RUN
# -------------------------------------------------------------------
if __name__ == "__main__":
    categorize_customers()
