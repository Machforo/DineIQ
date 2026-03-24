# DineIQ\Backend\routes\dashboard.py

from fastapi import APIRouter, HTTPException
from services.dependencies import sheets
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
        "reviews": "Customer_Reviews"
    }
    
    sheet_name = entity_map.get(entity.lower())
    if not sheet_name:
        raise HTTPException(status_code=400, detail=f"Invalid entity: {entity}")
    
    try:
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
