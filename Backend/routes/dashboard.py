# DineIQ\Backend\routes\dashboard.py

from fastapi import APIRouter, HTTPException, Request
from services.dependencies import sheets, sqlite_db
from services.clean_nan import clean_nan

dashboard_router = APIRouter()

def normalize_to_dashboard(rows, entity):
    """
    Shim to map SQLite snake_case field names back to the original 
    capitalized names expected by the Dashboard frontend.
    """
    if not rows:
        return rows
        
    entity = entity.lower()
    mappings = {
        "menu": {
            "item_id": "Item_ID", "name": "Item_Name", "category": "Item_Category",
            "base_price": "Base_Price", "low_cap_price": "Low_Cap_Price", 
            "high_cap_price": "High_Cap_Price", "current_price": "Current_Price",
            "description": "Item_Description", "is_active": "Is_Active"
        },
        "campaigns": {
            "campaign_id": "Campaign_ID", "text": "Campaign_Text", 
            "target_customer_category": "Target_Customer_Category",
            "start_datetime": "Campaign_Start_DateTime", "end_datetime": "Campaign_End_DateTime",
            "message_count": "Campaign_Message_Count", "campaign_type": "Campaign_Type",
            "status": "Campaign_Status"
        },
        "reviews": {
            "review_id": "Review_ID", "customer_id": "Customer_ID", 
            "review_datetime": "Review_Date_Time", "food_quality": "Food_Quality",
            "service": "Service", "cleanliness": "Cleanliness",
            "value_for_money": "Value_For_Money", "overall_experience": "Overall_Experience",
            "comments": "Additional_Comments", "review_type": "Review_Type",
            "urgency": "Urgency", "assigned_to": "Assigned_To",
            "actions_needed": "Actions_Needed", "internal_comments": "Internal_Comments",
            "status": "Status", "customer_name": "Customer_Name", "customer_email": "Customer_Email"
        },
        "customers": {
            "customer_id": "Customer_ID", "name": "Customer_Name", "email": "Customer_Email",
            "phone": "Customer_Phone", "date_of_birth": "Date_of_Birth",
            "customer_category": "Customer_Category", "table_number": "Table_Number",
            "created_at": "Creation_DateTime", "last_login": "Last_Login_DateTime"
        },
        "insights": {
            "customer_id": "Customer_ID", "dietary": "Dietary", "favorites": "Favorites",
            "aov": "AOV", "frequency": "Frequency", "attitude": "Attitude",
            "customer_score": "Customer_Score", "customer_name": "Customer_Name"
        },
        "preferences": {
            "customer_id": "Customer_ID", "dietary_type": "Dietary_Type",
            "preferred_soup": "Preferred_Soup", "favorite_bun": "Favorite_Bun",
            "dessert_preference": "Dessert_Preference", "updated_at": "Timestamp",
            "customer_name": "Customer_Name", "customer_email": "Customer_Email"
        },
        "activities": {
            "customer_id": "Customer_ID", "activities": "Activities",
            "insights": "Insights", "created_at": "Timestamp",
            "customer_name": "Customer_Name", "customer_email": "Customer_Email"
        },
        "chats": {
            "chat_id": "Chat_ID", "customer_id": "Customer_ID",
            "chat_datetime": "Chat_Date_Time", "session_text": "Session_Text",
            "customer_name": "Customer_Name", "customer_email": "Customer_Email"
        },
        "staff": {
            "staff_id": "Staff_ID", "name": "Staff_Name", "email": "Staff_Email",
            "phone": "Staff_Phone", "role": "Staff_Role", "is_active": "Is_Active",
            "created_at": "Creation_DateTime", "last_login": "Last_Login_DateTime"
        }
    }

    # Special handling for Campaign flexible columns
    if entity == "campaigns":
        ent_map = mappings["campaigns"]
        for i in range(1, 11):
            ent_map[f"message_template_{i}"] = f"Message_Template #{i}"
            ent_map[f"message_send_timing_{i}"] = f"Message_Send_Timing #{i}"

    field_map = mappings.get(entity)
    if not field_map:
        return rows

    normalized = []
    for row in rows:
        new_row = dict(row)
        for sql_key, dash_key in field_map.items():
            if sql_key in new_row:
                val = new_row[sql_key]
                # Special normalization for Is_Active if it's 1/0
                if sql_key == "is_active" and isinstance(val, int):
                    val = "ACTIVE" if val == 1 else "INACTIVE"
                new_row[dash_key] = val
        normalized.append(new_row)
    return normalized

@dashboard_router.get("/{entity}/list")
async def list_dashboard_entity(entity: str):
    """
    Generic endpoint to list entities for the Dashboard.
    Available entities: menu, orders, order_items, customers, insights, preferences, activities, chats, campaigns, reviews
    """
    entity_map = {
        "menu": "Menu",
        "orders": "Orders",
        "order_items": "Order_Items",
        "customers": "Customer_Auth",
        "insights": "Customer_Insights",
        "preferences": "Customer_Preferences",
        "activities": "Customer_Activities",
        "chats": "Chats",
        "campaigns": "Campaigns",
        "reviews": "Customer_Reviews",
        "staff": "Staff"
    }
    
    entity_to_table = {
        "menu": "menu",
        "customers": "customers",
        "insights": "customer_insights",
        "preferences": "customer_preferences",
        "activities": "customer_activities",
        "chats": "chats",
        "campaigns": "campaigns",
        "reviews": "reviews",
        "staff": "staff"
    }
    
    try:
        e_low = entity.lower()
        
        # --- Specialized Joins -------------------------------------------
        
        if e_low == "orders":
            query = """
                SELECT o.*, c.name as customer_name
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.customer_id
                ORDER BY o.created_at DESC
            """
            return sqlite_db.fetch_all(query)
            
        elif e_low == "order_items":
            query = """
                SELECT oi.*, m.name as item_name
                FROM order_items oi
                LEFT JOIN menu m ON oi.item_id = m.item_id
                ORDER BY oi.order_id DESC
            """
            return sqlite_db.fetch_all(query)

        elif e_low == "insights":
            query = """
                SELECT ci.*, c.name as customer_name
                FROM customer_insights ci
                LEFT JOIN customers c ON ci.customer_id = c.customer_id
            """
            rows = sqlite_db.fetch_all(query)
            return normalize_to_dashboard(rows, entity)

        elif e_low in ["preferences", "activities", "chats", "reviews"]:
            # These all need customer identity details
            table = entity_to_table[e_low]
            query = f"""
                SELECT t.*, c.name as customer_name, c.email as customer_email
                FROM {table} t
                LEFT JOIN customers c ON t.customer_id = c.customer_id
            """
            if e_low == "activities": query += " ORDER BY t.created_at DESC"
            if e_low == "chats": query += " ORDER BY t.chat_datetime DESC"
            if e_low == "reviews": query += " ORDER BY t.review_datetime DESC"
            
            rows = sqlite_db.fetch_all(query)
            return normalize_to_dashboard(rows, entity)
        
        # --- Generic Fallback -------------------------------------------
        
        table_name = entity_to_table.get(e_low)
        if table_name:
            rows = sqlite_db.fetch_all(f"SELECT * FROM {table_name}")
            return normalize_to_dashboard(rows, entity)
            
        sheet_name = entity_map.get(e_low)
        if not sheet_name:
            raise HTTPException(status_code=400, detail=f"Invalid entity: {entity}")
        
        data = sheets.read_sheet_rows(sheet_name)
        return clean_nan(data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@dashboard_router.get("/analytics/summary")
async def get_analytics_summary():
    """
    Aggregated stats for the Dashboard Index/Analytics page.
    """
    try:
        # Fetch counts from SQLite
        counts = sqlite_db.fetch_one("""
            SELECT 
                (SELECT COUNT(*) FROM menu) as total_items,
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COUNT(*) FROM customers) as total_customers,
                (SELECT COUNT(*) FROM reviews) as total_reviews,
                (SELECT COUNT(*) FROM menu WHERE is_active = 1 OR UPPER(is_active) = 'ACTIVE') as active_items,
                (SELECT COUNT(*) FROM orders WHERE UPPER(status) NOT IN ('CANCELLED', 'VOID')) as placed_orders,
                (SELECT AVG(overall_experience) FROM reviews) as avg_rating
        """)
        
        return {
            "total_items": counts["total_items"] or 0,
            "total_orders": counts["total_orders"] or 0,
            "total_customers": counts["total_customers"] or 0,
            "total_reviews": counts["total_reviews"] or 0,
            "active_items": counts["active_items"] or 0,
            "placed_orders": counts["placed_orders"] or 0,
            "avg_rating": round(float(counts["avg_rating"] or 0.0), 2)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@dashboard_router.post("/menu/add")
async def add_menu_item(request: Request):
    """
    Add a new menu item to SQLite.
    """
    try:
        payload = await request.json()
        item_id = payload.get("Item_ID")
        if not item_id:
            raise HTTPException(status_code=400, detail="Item_ID is required")

        data = {
            "item_id": item_id,
            "name": payload.get("Item_Name", ""),
            "category": payload.get("Item_Category", ""),
            "base_price": payload.get("Base_Price", 0),
            "low_cap_price": payload.get("Low_Cap_Price", 0),
            "high_cap_price": payload.get("High_Cap_Price", 0),
            "current_price": payload.get("Current_Price", 0),
            "description": payload.get("Item_Description", ""),
            "is_active": "ACTIVE" if str(payload.get("Is_Active", "")).upper() == "ACTIVE" else "INACTIVE"
        }
        
        # Check if exists
        existing = sqlite_db.fetch_all(f"SELECT item_id FROM menu WHERE item_id = '{item_id}'")
        if existing:
            raise HTTPException(status_code=400, detail="Item already exists")

        sqlite_db.insert("menu", data)
        return {"message": "Menu item added successfully", "item_id": item_id}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@dashboard_router.patch("/menu/update/{item_id}")
async def update_menu_item(item_id: str, request: Request):
    """
    Update an existing menu item in SQLite.
    """
    try:
        payload = await request.json()
        
        existing = sqlite_db.fetch_all(f"SELECT * FROM menu WHERE item_id = '{item_id}'")
        if not existing:
            raise HTTPException(status_code=404, detail="Item not found")

        updates = {}
        if "Item_Name" in payload: updates["name"] = payload["Item_Name"]
        if "Item_Category" in payload: updates["category"] = payload["Item_Category"]
        if "Base_Price" in payload: updates["base_price"] = payload["Base_Price"]
        if "Low_Cap_Price" in payload: updates["low_cap_price"] = payload["Low_Cap_Price"]
        if "High_Cap_Price" in payload: updates["high_cap_price"] = payload["High_Cap_Price"]
        if "Current_Price" in payload: updates["current_price"] = payload["Current_Price"]
        if "Item_Description" in payload: updates["description"] = payload["Item_Description"]
        if "Is_Active" in payload: updates["is_active"] = "ACTIVE" if str(payload["Is_Active"]).upper() == "ACTIVE" else "INACTIVE"

        sqlite_db.update("menu", updates, condition={"item_id": item_id})

        return {"message": "Menu item updated successfully", "item_id": item_id}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@dashboard_router.delete("/menu/delete/{item_id}")
async def delete_menu_item(item_id: str):
    """
    Delete a menu item from SQLite.
    """
    try:
        existing = sqlite_db.fetch_all(f"SELECT * FROM menu WHERE item_id = '{item_id}'")
        if not existing:
            raise HTTPException(status_code=404, detail="Item not found")

        sqlite_db.execute("DELETE FROM menu WHERE item_id = ?", (item_id,))
        return {"message": "Menu item deleted successfully", "item_id": item_id}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
