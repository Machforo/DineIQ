# DineIQ\Backend\services\campaings.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
import os
import re
import time
from datetime import datetime
from dateutil import parser

from config import REQUEST_DELAY

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
def process_campaigns():
    """
    Google Sheets database document: 'DineIQ_DB' has following fields in 'Campaigns' sheet:
    Campaign_ID, 
    Campaign_Text, 
    Target_Customer_Category, 
    Campaign_Start_DateTime, 
    Campaign_End_DateTime, 
    Campaign_Message_Count, 
    Campaign_Type, 
    Campaign_Status, 
    Message_Template, 
    Message_Send_Timing
    
    Campaign Data is updated from a Campign form in Dashboard.
    All fields except Campaign_ID and Campaign_Status are written.
    Note: Campaign_Type is not yet processed. It is meant to be provided from Camapaign form later.
    
    In process_campaigns(), Campaign_ID and Campaign_Status are auto-updated.
    Only the campaigns not processed before are analyzed.
    
    """
    print("#" * 100)
    print("📢 Campaigns Processing started ...")

    # Initialize Sheets Client
    sheets_client.init_service()

    # Process Campaigns sheet
    df_campaigns = sheets_client.read_sheet(CAMPAIGNS_SHEET)

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

        # Auto-generate Campaign_ID if missing
        if not campaign_id:
            campaign_id = generate_campaign_id(existing_ids)
            df_campaigns.at[idx, "Campaign_ID"] = campaign_id
            existing_ids.append(campaign_id)
            campaignIdUpdated = True
            print(f"\n🆔 Assigned Campaign_ID: {campaign_id}")

        # Determine Campaign_Status
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
        sheets_client.update_sheet(
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
    process_campaigns()
