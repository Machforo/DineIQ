# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
# Standard Library (no install needed)
import os
import re
import time
import json
from datetime import datetime

# External packages required
import pandas as pd
from google.oauth2 import service_account
import google.generativeai as genai
from dateutil import parser

from config import (
    BATCH_SIZE,
    REQUEST_DELAY,
    # MAX_RETRIES,
    # RETRY_DELAY,
)

# -------------------------------------------------------------------
# 🔧 SETUP KEYS and URLs
# -------------------------------------------------------------------
SPREADSHEET_ID = os.getenv("SPREADSHEET_ID")
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
# 🔧 SETUP: Google Sheets
# Created a new project 'DineIQ Project' in Google Cloud Account.
# Enabled Google Sheets API for this project.
# Created a service account 'DineIQ Service Account' with Editor role.
# Created a new JSON key by clicking on the service account email.
# Key 'dineIQ_service_account.json' is downloaded, move it to project folder.
# Added [SERVICE_ACCOUNT_FILE = "dineIQ_service_account.json"] in .env file.
# -------------------------------------------------------------------
from googleapiclient.discovery import build
from google.oauth2.service_account import Credentials
import os
from dotenv import load_dotenv

load_dotenv()

SERVICE_ACCOUNT_FILE = os.getenv("SERVICE_ACCOUNT_FILE")

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

def init_google_sheets():
    credentials = Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=SCOPES
    )

    service = build("sheets", "v4", credentials=credentials)
    return service.spreadsheets()

# -------------------------------------------------------------------
# 🔧 SETUP: Google Gemini
# https://aistudio.google.com/api-keys
# Created a new API key for DineIQ project 'DineIQ_Gemini_API_Key'
# API key is configured in .env file as GEMINI_API_KEY
# Model configured in .env file as GEMINI_MODEL
# -------------------------------------------------------------------
def init_gemini():
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL")
    
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY missing")

    if not GEMINI_MODEL:
        raise Exception("GEMINI_MODEL missing")

    genai.configure(api_key=GEMINI_API_KEY)
    return genai.GenerativeModel(GEMINI_MODEL)

# -------------------------------------------------------------------
# 🧹 SHEET HELPERS
# Caching can be added to avoid repeated sheet reads
# -------------------------------------------------------------------
def read_sheet(service, sheet_name):
    """Read a Google Sheet into a pandas DataFrame (auto-pads rows)."""
    result = service.values().get(
        spreadsheetId=SPREADSHEET_ID,
        range=f"{sheet_name}!A:Z"
    ).execute()
    values = result.get("values", [])
    if not values:
        raise ValueError(f"No data found in sheet '{sheet_name}'.")
    headers, rows = values[0], values[1:]
    clean_rows = [
        r + [""] * (len(headers) - len(r)) if len(r) < len(headers) else r[:len(headers)]
        for r in rows
    ]
    return pd.DataFrame(clean_rows, columns=headers)

def update_sheet(service, sheet_name, df, columns_to_update=None):
    """Write a DataFrame back to Google Sheets.
    Update specific columns in a Google Sheet in a single batch update.
    Safely update only specific columns (even non-contiguous ones)
    without clearing or overwriting intermediate columns.
    Preserves dropdowns, formatting, and reduces write API calls.
    - If columns_to_update is None, updates all columns.
    - Does NOT clear the sheet, so dropdowns and formatting remain intact.
    """

    if columns_to_update is None:
        columns_to_update = df.columns.tolist()
    print(f"📝 Updating columns individually: {', '.join(columns_to_update)}")

    # Helper to convert column index (1-based) to A, B, ..., AA, AB, etc.
    def col_letter(n):
        result = ''
        while n > 0:
            n, remainder = divmod(n - 1, 26)
            result = chr(65 + remainder) + result
        return result

    for col in columns_to_update:
        if col not in df.columns:
            print(f"⚠️ Column '{col}' not found in DataFrame — skipping.")
            continue

        col_idx = df.columns.get_loc(col) + 1
        col_letter_str = col_letter(col_idx)

        # Prepare column values (excluding header)
        values = [[v] for v in df[col].tolist()]

        # Update this column only
        service.values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=f"{sheet_name}!{col_letter_str}2",  # Start from row 2
            valueInputOption="RAW",
            body={"values": values},
        ).execute()
        print(f"✅ Column '{col}' updated ({col_letter_str})")

    print(f"✅ Partial update completed for sheet '{sheet_name}'.")

# -------------------------------------------------------------------
# 🧠 LLM CALLS
# -------------------------------------------------------------------
def call_gemini_with_retry(model, prompt, max_retries=3):
    """Call Gemini with basic retry/backoff handling."""
    for attempt in range(1, max_retries + 1):
        try:
            response = model.generate_content(prompt)
            if response and response.text:
                return response.text
        except Exception as e:
            print(f"⚠️ Gemini call failed (attempt {attempt}): {e}")
            if "429" in str(e):  # rate limit
                print("⏳ Waiting 60 seconds due to rate limit...")
                time.sleep(60)
            else:
                time.sleep(5)
    return None

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

    df_orders = read_sheet(sheets, ORDERS_SHEET)
    if df_orders.empty:
        return df_orders

    return df_orders[df_orders["Customer_ID"] == customer_id].copy()

def fetch_order_items(sheets, customer_id):
    if not customer_id:
        return pd.DataFrame()

    df_orders = read_sheet(sheets, ORDERS_SHEET)
    df_items = read_sheet(sheets, ORDER_ITEMS_SHEET)

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
        orders["Order_Created_DateTime"], errors="coerce"
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

    response = call_gemini_with_retry(model, prompt)
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
# 🎯 CAMPAIGN LOGIC
# -------------------------------------------------------------------
def generate_campaign_id(existing_ids):
    pattern = re.compile(r"Cmp_(\d+)")
    nums = [int(pattern.search(cid).group(1)) for cid in existing_ids if pattern.search(cid)]
    next_id = max(nums) + 1 if nums else 1
    return f"Cmp_{next_id:04d}"

# -------------------------------------------------------------------
# 🚀 MAIN PROCESS
# -------------------------------------------------------------------
def process_customers_and_campaigns():
    """
    Processes customer chat data and campaign details using Gemini LLM.
    Adds:
    1. Smart change detection (writes only if new/changed data)
    2. Skips reprocessing already analyzed customers
    """

    sheets = init_google_sheets()

    # LLM instances
    # gemini_customer_analyzer = init_gemini()
    gemini_customer_categorizer = init_gemini()
    print("✅ Initialized Gemini instances.")

    # === STEP 1: Read Customers & Chats sheets ===
    # df_customers = read_sheet(sheets, CUSTOMER_AUTH_SHEET)
    df_chats = read_sheet(sheets, CHATS_SHEET)

    # Ensure required column exists in Chats sheet
    if "Customer_Chat_Category" not in df_chats.columns:
        df_chats["Customer_Chat_Category"] = ""

    total_chats = len(df_chats)
    print(f"🧾 Found {total_chats} chat records in '{CHATS_SHEET}'.")
    print("#" * 100)

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

            print(f"🔍 Analyzing chat {chat_id} ...")

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
        print("🔍 Checking for updates in Chats sheet...")
        existing_chats = read_sheet(sheets, CHATS_SHEET)

        has_changes = False
        if not existing_chats.empty and "Customer_Chat_Category" in existing_chats.columns:
            old_vals = existing_chats["Customer_Chat_Category"].astype(str).fillna("").tolist()
            new_vals = df_chats["Customer_Chat_Category"].astype(str).fillna("").tolist()
            has_changes = old_vals != new_vals

        if has_changes:
            print("💾 Changes found — updating Chats sheet...")
            update_sheet(
                sheets,
                CHATS_SHEET,
                df_chats,
                columns_to_update=["Customer_Chat_Category"]
            )
            # customersInfoUpdated = True
        else:
            print("✅ No new chat updates — skipping Chats sheet write.")
            # customersInfoUpdated = False

    print("#" * 100)

    # === STEP 3: Process Campaigns sheet ===
    df_campaigns = read_sheet(sheets, CAMPAIGNS_SHEET)

    # Ensure required columns exist
    for col in ["Campaign_ID", "Campaign_Status"]:
        if col not in df_campaigns.columns:
            df_campaigns[col] = ""

    print(f"\n📢 Processing {len(df_campaigns)} campaigns...")

    existing_ids = df_campaigns["Campaign_ID"].dropna().tolist()
    now = datetime.now()

    # Columns to be written
    columnsToWrite = []

    # Update flags
    campaignIdUpdated = False
    campaignStatusUpdated = False

    for idx, row in df_campaigns.iterrows():
        campaign_id = str(row.get("Campaign_ID", "")).strip()
        campaign_text = str(row.get("Campaign_Text", "")).strip()
        target_category = str(row.get("Target_Customer_Category", "")).strip()
        start_dt_str = str(row.get("Campaign_Start_DateTime", "")).strip()
        end_dt_str = str(row.get("Campaign_End_DateTime", "")).strip()
        current_status = str(row.get("Campaign_Status", "")).strip().upper()

        # Skip incomplete rows
        if not all([campaign_text, target_category, start_dt_str, end_dt_str]):
            continue

        # Parse date-times
        try:
            start_dt = parser.parse(start_dt_str)
            end_dt = parser.parse(end_dt_str)
        except Exception as e:
            print(f"⚠️ Could not parse date-time at row {idx+1}: {e}")
            continue

        # === Step 1: Auto-generate Campaign_ID if missing ===
        if not campaign_id:
            campaign_id = generate_campaign_id(existing_ids)
            df_campaigns.at[idx, "Campaign_ID"] = campaign_id
            existing_ids.append(campaign_id)
            campaignIdUpdated = True
            print(f"🆔 Assigned Campaign_ID: {campaign_id}")

        # === Step 2: Determine Campaign_Status ===
        if start_dt <= now < end_dt:
            new_status = "ACTIVE"
        elif now >= end_dt:
            new_status = "INACTIVE"
        else:
            new_status = "UPCOMING"

        if new_status != current_status:
            df_campaigns.at[idx, "Campaign_Status"] = new_status
            campaignStatusUpdated = True
            print(f"📅 {campaign_id} status set to {new_status}")

        time.sleep(REQUEST_DELAY)

    # Append columns to write
    if campaignIdUpdated:
        columnsToWrite.append("Campaign_ID")
    if campaignStatusUpdated:
        columnsToWrite.append("Campaign_Status")

    # Update Campaigns sheet only if needed
    if columnsToWrite:
        update_sheet(
            sheets,
            CAMPAIGNS_SHEET,
            df_campaigns,
            columns_to_update=columnsToWrite
        )
        print("\n✅ Campaigns updated successfully.")
    else:
        print("\n✅ No campaign updates detected.")

    print("#" * 100)

    
# -------------------------------------------------------------------
# ▶️ RUN
# -------------------------------------------------------------------
if __name__ == "__main__":
    process_customers_and_campaigns()
