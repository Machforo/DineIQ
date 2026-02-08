from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import uuid
import datetime

# Services & Agents
from services.sheets import SheetsClient
from agents.pricing import PricingAgent

order_router = APIRouter()
pricing_agent = PricingAgent()
sheets_client = SheetsClient(spreadsheet_id=os.getenv("SPREADSHEET_ID"))

ORDERS_SHEET = "Orders"
ORDER_ITEMS_SHEET = "Order_Items"

# ---------------------------------------------------------
# Request Models
# ---------------------------------------------------------
class CartItem(BaseModel):
    id: Optional[str] = None # Internal name
    Item_ID: Optional[str] = None # Frontend name
    name: Optional[str] = None
    Item_Name: Optional[str] = None
    price: Optional[float] = 0.0
    Current_Price: Optional[float] = 0.0
    quantity: Optional[int] = 1
    category: Optional[str] = None

class PricingRequest(BaseModel):
    customer_email: str
    cart_items: List[CartItem]
    
class OrderRequest(BaseModel):
    customer_email: str
    cart_items: List[CartItem]
    discount_amount: float = 0.0
    final_total: float
    payment_method: str = "Cash"

# ---------------------------------------------------------
# Endpoints
# ---------------------------------------------------------

@order_router.post("/pricing-strategy")
async def get_pricing_strategy(req: PricingRequest):
    """
    Calculates subtotal, discounts, and visual nudges.
    Frontend calls this as 'pricing-strategy'.
    """
    if not req.cart_items:
        return {"pricing": {"subtotal": 0, "final_total": 0}}
        
    # Normalize items for PricingAgent/Sheets
    cart_items_normalized = []
    for item in req.cart_items:
        normalized = {
            "Item_ID": item.Item_ID or item.id,
            "Item_Name": item.Item_Name or item.name or "Item",
            "Current_Price": item.Current_Price or item.price or 0.0,
            "quantity": item.quantity or 1,
            "category": item.category or "General"
        }
        cart_items_normalized.append(normalized)

    subtotal = sum(i["Current_Price"] * i["quantity"] for i in cart_items_normalized)
    order_count = 0 
    
    # TODO: Fetch real order count from Sheets for Loyalty logic
    # rows = sheets_client.read_sheet(ORDERS_SHEET)
    # filter by email...
    
    return pricing_agent.get_pricing_strategy(subtotal, order_count, cart_items_normalized)


@order_router.post("/place-order")
async def place_order(req: OrderRequest):
    """
    Finalizes the order and saves to Google Sheets.
    """
    order_id = f"Ord_{uuid.uuid4().hex[:8]}"
    timestamp = datetime.datetime.now().isoformat()
    
    # Normalize items for consistency
    cart_items_normalized = []
    for item in req.cart_items:
        normalized = {
            "Item_ID": item.Item_ID or item.id,
            "Item_Name": item.Item_Name or item.name or "Item",
            "Current_Price": item.Current_Price or item.price or 0.0,
            "quantity": item.quantity or 1,
            "category": item.category or "General"
        }
        cart_items_normalized.append(normalized)

    try:
        # 1. Save to Orders Sheet
        subtotal = sum(i["Current_Price"] * i["quantity"] for i in cart_items_normalized)
        order_row = [
            order_id,
            req.customer_email,
            subtotal,
            req.discount_amount,
            req.final_total,
            req.payment_method,
            "CREATED",
            timestamp
        ]
        sheets_client.append_row(ORDERS_SHEET, order_row)
        
        # 2. Save to Order_Items Sheet
        for item in cart_items_normalized:
            item_row = [
                order_id,
                item["Item_ID"],
                item["Item_Name"],
                item["quantity"],
                item["Current_Price"]
            ]
            sheets_client.append_row(ORDER_ITEMS_SHEET, item_row)
            
        return {"status": "success", "order_id": order_id, "message": "Order placed successfully"}
        
    except Exception as e:
        print(f"Order Placement Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to place order")

@order_router.get("/coupons")
def get_coupons():
    return {"coupons": pricing_agent._get_coupons(0, 0)} # Mock: returns generic list
