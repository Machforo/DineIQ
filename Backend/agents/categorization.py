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

ACTIVE_AGENTS_SHEET     = "Active_Agents"       # Read-only, Writable from Dashboard
ADMINS_SHEET            = "Admins"              # Writable from Dashboard
CUSTOMER_AUTH_SHEET     = "Customer_Auth"       # Read-Write from Customer Frontend Web/App
CUSTOMER_INSIGHTS_SHEET = "Customer_Insights"   # Updated with AI/Automation
MENU_SHEET              = "Menu"                # Writable from Dashboard
INVENTORY_SHEET         = "Inventory"           # Writable from Dashboard
ORDERS_SHEET            = "Orders"              # Writable from Customer Frontend Web/App, Partially Updated with AI/Automation
ORDER_ITEMS_SHEET       = "Order_Items"         # Writable from Customer Frontend Web/App
AGENT_ACTIONS_SHEET     = "Agent_Actions"       # Updated with AI/Automation
CHATS_SHEET             = "Chats"               # Writable from Customer-AI Frontend Chatbot
CAMPAIGNS_SHEET         = "Campaigns"           # Writable from Dashboard Campaign Form, Partially updated with AI/Automation

# -------------------------------------------------------------------
# 🧩 CLIENT ENRICHMENT
# -------------------------------------------------------------------
def resolve_customer_id_from_context(chat_row):
    customer_id = chat_row.get("Customer_ID")
    if customer_id and str(customer_id).strip():
        return customer_id.strip()
    return None

def fetch_orders(sheets, customer_id):
    if not customer_id:
        return pd.DataFrame()

    df_orders = sheets_client.read_sheet(ORDERS_SHEET)
    if df_orders.empty:
        return df_orders

    return df_orders[df_orders["Customer_ID"] == customer_id].copy()

def fetch_order_items(sheets, customer_id):
    if not customer_id:
        return pd.DataFrame()

    df_orders = sheets_client.read_sheet(ORDERS_SHEET)
    df_items = sheets_client.read_sheet(ORDER_ITEMS_SHEET)

    if df_orders.empty or df_items.empty:
        return pd.DataFrame()

    order_ids = df_orders.loc[
        df_orders["Customer_ID"] == customer_id, "Order_ID"
    ]

    return df_items[df_items["Order_ID"].isin(order_ids)].copy()

MENU_DIETARY_MAP = {
    "paneer": "Vegetarian",
    "dal": "Vegetarian",
    "chicken": "Non-Vegetarian",
    "mutton": "Non-Vegetarian",
    "egg": "Eggetarian",
    "vegan": "Vegan"
}

def infer_dietary_from_items(order_items):
    if order_items.empty:
        return None

    counts = {}

    for item in order_items["Item_Name"].astype(str):
        for key, dietary in MENU_DIETARY_MAP.items():
            if key in item.lower():
                counts[dietary] = counts.get(dietary, 0) + 1

    if not counts:
        return None

    dominant, count = max(counts.items(), key=lambda x: x[1])
    total = sum(counts.values())

    return dominant if count / total >= 0.6 else dominant

AOV_BUCKETS = [
    (0, 299, "Low Spender"),
    (300, 599, "Mid Spender"),
    (600, 999, "High Spender"),
    (1000, float("inf"), "Premium Spender")
]

def infer_aov(orders):
    if orders.empty:
        return None

    orders["Order_Price"] = pd.to_numeric(
        orders["Order_Price"], errors="coerce"
    )

    avg = orders["Order_Price"].mean()

    for low, high, label in AOV_BUCKETS:
        if low <= avg <= high:
            return label

    return None

def infer_frequency(orders):
    if orders.empty:
        return None

    orders["Order_Created_DateTime"] = pd.to_datetime(
        orders["Order_Created_DateTime"],
        errors="coerce",
        format="mixed",
    )

    cutoff = pd.Timestamp.now() - pd.Timedelta(days=30)
    count = (orders["Order_Created_DateTime"] >= cutoff).sum()

    if count <= 1:
        return "Occasional"
    elif count <= 4:
        return "Regular"
    elif count <= 8:
        return "Frequent"
    else:
        return "Loyal"

def infer_attitude(orders):
    if orders.empty:
        return None

    total = len(orders)
    cancelled = orders[
        orders["Order_Status"]
        .astype(str)
        .str.lower()
        .isin(["cancelled", "refunded"])
    ]

    if total > 0 and len(cancelled) / total >= 0.3:
        return "Refund-Prone"

    avg = orders["Order_Price"].astype(float).mean()
    if avg >= 600:
        return "Quality-Seeker"

    return "Value-Seeker"

def safe_json_parse(text):
    if not text:
        return {}

    try:
        return json.loads(text)
    except:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except:
            pass

    return {}

def infer_from_chat_llm(model, chat_text):
    prompt = f"""
    You are classifying a restaurant customer based ONLY on chat text.

    Choose values STRICTLY from the allowed categories below.
    If a category cannot be inferred confidently, return null.

    -------------------
    ALLOWED CATEGORIES
    -------------------

    Dietary_Preferences (choose one):
    - Vegetarian
    - Non-Vegetarian
    - Vegan
    - Eggetarian
    - Jain

    Order_Attitude_Categories (choose one):
    - Value-Seeker
    - Quality-Seeker
    - Coupon-Driven
    - Refund-Prone

    Favorite_Food_Items:
    - Extract 1–2 food items explicitly mentioned in chat

    -------------------
    Chat Text:
    {chat_text}

    -------------------
    Output STRICT JSON only:
    {{
      "dietary": null | "<one of allowed values>",
      "attitude": null | "<one of allowed values>",
      "favorite_food_items": []
    }}
    """

    response = gemini_client.call_gemini_with_retry(
        prompt=prompt,
    )

    return safe_json_parse(response)

def infer_customer_category(model, chat_row, sheets):
    chat_text = str(chat_row.get("Chat_Session_Text", "")).strip()
    if not chat_text:
        return ""

    customer_id = resolve_customer_id_from_context(chat_row)

    orders = fetch_orders(sheets, customer_id)
    order_items = fetch_order_items(sheets, customer_id)

    order_insights = {
        "dietary": infer_dietary_from_items(order_items),
        "aov": infer_aov(orders),
        "frequency": infer_frequency(orders),
        "attitude": infer_attitude(orders)
    }

    chat_insights = infer_from_chat_llm(model, chat_text)

    final = [
        order_insights["dietary"] or chat_insights.get("dietary"),
        order_insights["aov"],
        order_insights["frequency"],
        order_insights["attitude"] or chat_insights.get("attitude")
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

    # Initialize Sheets Client
    sheets = sheets_client.init_service()

    # LLM instances
    gemini_customer_categorizer = gemini_client.init_gemini()
    print("\n✅ Initialized Gemini instances.")

    # === STEP 1: Read Customers & Chats sheets ===
    # df_customers = read_sheet(sheets, CUSTOMER_AUTH_SHEET)
    df_chats = sheets_client.read_sheet(CHATS_SHEET)

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
            gemini_customer_categorizer,
            row,
            sheets
            )

            df_chats.at[idx, "Customer_Chat_Category"] = category
            print(f"🏷️ Chat {chat_id} categorized as '{category}'")

            time.sleep(REQUEST_DELAY)

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
            # customersInfoUpdated = True
        else:
            print("\n✅ No new chat updates — skipping Chats sheet write.")
            # customersInfoUpdated = False

    print("#" * 100)
    
# -------------------------------------------------------------------
# ▶️ RUN
# -------------------------------------------------------------------
if __name__ == "__main__":
    categorize_customers()
