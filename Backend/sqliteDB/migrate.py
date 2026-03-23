import pandas as pd
import sqlite3

DB_NAME = "DineIQ_Database.db"
EXCEL_FILE = "DineIQ_DB.xlsx"

def clean_columns(df):
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    return df.dropna(how="all")

def insert_strict(df, table_name, valid_cols, conn, pk_col=None):
    cols_to_insert = [c for c in valid_cols if c in df.columns]
    safe_df = df[cols_to_insert]
    if pk_col and pk_col in safe_df.columns:
        safe_df = safe_df.drop_duplicates(subset=[pk_col], keep="last")
    safe_df.to_sql(table_name, conn, if_exists="append", index=False)

# -----------------------
# WIPE DATABASE CLEAN (Safely using SQL instead of physical file deletion)
# -----------------------
conn = sqlite3.connect(DB_NAME)
cursor = conn.cursor()

tables_to_clear = [
    "order_items", "orders", "campaign_messages", "campaigns", "chats", 
    "reviews", "customer_insights", "customer_activities", 
    "customer_preferences", "menu", "customer_auth", "customers"
]
for table in tables_to_clear:
    # Safely clear out existing data so re-running migrate.py doesn't crash on UNIQUE constraints
    cursor.execute(f"DELETE FROM {table}")
conn.commit()

# -----------------------
# CUSTOMERS
# -----------------------
df = pd.read_excel(EXCEL_FILE, sheet_name="Customer_Auth")
df = clean_columns(df)

customers = df.rename(columns={
    "customer_name": "name",
    "customer_email": "email",
    "customer_phone": "phone",
    "creation_datetime": "created_at",
    "last_login_datetime": "last_login"
})
insert_strict(customers, "customers", ["customer_id","name","email","phone","date_of_birth","customer_category","table_number","created_at","last_login"], conn, "customer_id")
insert_strict(df, "customer_auth", ["customer_id","otp_hash","otp_expires_at"], conn, "customer_id")

# -----------------------
# MENU
# -----------------------
df = pd.read_excel(EXCEL_FILE, sheet_name="Menu")
df = clean_columns(df)
menu_df = df.rename(columns={
    "item_name": "name",
    "item_category": "category",
    "item_description": "description",
    "is_active": "is_active"
})
insert_strict(menu_df, "menu", ["item_id", "name", "category", "base_price", "low_cap_price", "high_cap_price", "current_price", "description", "is_active"], conn, "item_id")

# -----------------------
# ORDERS
# -----------------------
df = pd.read_excel(EXCEL_FILE, sheet_name="Orders")
df = clean_columns(df)
orders = df.rename(columns={
    "order_created_datetime": "created_at",
    "order_status": "status"
})
insert_strict(orders, "orders", ["order_id", "customer_id", "order_price", "created_at", "status", "table_number"], conn, "order_id")

# -----------------------
# ORDER ITEMS
# -----------------------
df = pd.read_excel(EXCEL_FILE, sheet_name="Order_Items")
df = clean_columns(df)
order_items = df.rename(columns={
    "item_quantity": "quantity",
    "item_price": "price"
})
insert_strict(order_items, "order_items", ["order_item_id", "order_id", "item_id", "quantity", "price"], conn, "order_item_id")

# -----------------------
# CUSTOMER PREFERENCES
# -----------------------
df = pd.read_excel(EXCEL_FILE, sheet_name="Customer_Preferences")
df = clean_columns(df)
prefs = df.rename(columns={"timestamp": "updated_at"})
insert_strict(prefs, "customer_preferences", ["customer_id", "dietary_type", "preferred_soup", "favorite_bun", "dessert_preference", "updated_at"], conn, "customer_id")

# -----------------------
# CUSTOMER ACTIVITIES
# -----------------------
df = pd.read_excel(EXCEL_FILE, sheet_name="Customer_Activities")
df = clean_columns(df)
acts = df.rename(columns={"timestamp": "created_at"})
insert_strict(acts, "customer_activities", ["id", "customer_id", "activities", "insights", "created_at"], conn, "id")

# -----------------------
# CUSTOMER INSIGHTS
# -----------------------
df = pd.read_excel(EXCEL_FILE, sheet_name="Customer_Insights")
df = clean_columns(df)
insert_strict(df, "customer_insights", ["customer_id", "dietary", "favorites", "aov", "frequency", "attitude", "customer_score"], conn, "customer_id")

# -----------------------
# REVIEWS
# -----------------------
df = pd.read_excel(EXCEL_FILE, sheet_name="Customer_Reviews")
df = clean_columns(df)
reviews = df.rename(columns={
    "review_date_time": "review_datetime",
    "additional_comments": "comments"
})
insert_strict(reviews, "reviews", ["review_id", "customer_id", "review_datetime", "food_quality", "service", "cleanliness", "value_for_money", "overall_experience", "comments", "review_type", "urgency", "assigned_to", "actions_needed", "internal_comments", "status"], conn, "review_id")

# -----------------------
# CHATS
# -----------------------
df = pd.read_excel(EXCEL_FILE, sheet_name="Chats")
df = clean_columns(df)
chats = df.rename(columns={
    "chat_date_time": "chat_datetime"
})
insert_strict(chats, "chats", ["chat_id", "customer_id", "chat_datetime", "session_text"], conn, "chat_id")

# -----------------------
# CAMPAIGNS
# -----------------------
df = pd.read_excel(EXCEL_FILE, sheet_name="Campaigns")
df = clean_columns(df)
campaigns = df.rename(columns={
    "campaign_text": "text",
    "campaign_start_datetime": "start_datetime",
    "campaign_end_datetime": "end_datetime",
    "campaign_status": "status"
})
insert_strict(campaigns, "campaigns", ["campaign_id", "text", "target_customer_category", "start_datetime", "end_datetime", "message_count", "campaign_type", "status"], conn, "campaign_id")

# Extract messages
messages = []
for _, row in df.iterrows():
    for i in range(1, 11):
        msg = row.get(f"message_template_{i}")
        timing = row.get(f"message_send_timing_{i}")
        if pd.notna(msg):
            messages.append({
                "campaign_id": row.get("campaign_id", ""),
                "message_text": msg,
                "send_timing": timing
            })

if messages:
    msg_df = pd.DataFrame(messages)
    insert_strict(msg_df, "campaign_messages", ["campaign_id", "message_text", "send_timing"], conn)

conn.commit()
conn.close()

print("✅ Migration completed successfully.")