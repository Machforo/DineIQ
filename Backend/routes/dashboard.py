# DineIQ\Backend\routes\dashboard.py

from fastapi import APIRouter, HTTPException, Request
from services.dependencies import sheets, sqlite_db
from services.clean_nan import clean_nan

dashboard_router = APIRouter()

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
    
    sheet_name = entity_map.get(entity.lower())
    if not sheet_name:
        raise HTTPException(status_code=400, detail=f"Invalid entity: {entity}")
    
    try:
        if entity.lower() == "orders":
            query = """
                SELECT o.*, c.name as customer_name
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.customer_id
                ORDER BY o.order_id ASC
            """
            return sqlite_db.fetch_all(query)
        elif entity.lower() == "order_items":
            query = """
                SELECT oi.*, m.name as item_name
                FROM order_items oi
                LEFT JOIN menu m ON oi.item_id = m.item_id
                ORDER BY oi.order_id ASC
            """
            return sqlite_db.fetch_all(query)
        
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
        menu = sheets.read_sheet("Menu")
        orders = sheets.read_sheet("Orders")
        customers = sheets.read_sheet("Customer_Auth")
        reviews = sheets.read_sheet("Customer_Reviews")
        
        return {
            "total_items": len(menu),
            "total_orders": len(orders),
            "total_customers": len(customers),
            "total_reviews": len(reviews),
            "active_items": len(menu[menu["Is_Active"] == "ACTIVE"]) if not menu.empty else 0,
            "placed_orders": len(orders[orders["Order_Status"] != "cancelled"]) if not orders.empty else 0,
            "avg_rating": float(reviews["Overall_Experience"].astype(float).mean()) if not reviews.empty else 0.0
        }
    except Exception as e:
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
