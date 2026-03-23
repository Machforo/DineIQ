from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import os
import datetime

# Services & Agents
from services.dependencies import sqlite_db
from agents.pricing import PricingAgent

order_router = APIRouter()
pricing_agent = PricingAgent()

# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------
def _get_next_sequential_id(table_name: str, id_column: str, prefix: str, padding: int = 4) -> str:
    row = sqlite_db.fetch_one(f"SELECT {id_column} FROM {table_name} ORDER BY {id_column} DESC LIMIT 1")
    if row and row[id_column]:
        import re
        match = re.search(r"(\d+)", str(row[id_column]))
        if match:
            num = int(match.group(1))
            return f"{prefix}_{str(num + 1).zfill(padding)}"
    return f"{prefix}_{'1'.zfill(padding)}"

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
    instructions: Optional[str] = None
    table_number: Optional[str] = None

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
    
    # Fetch real order count from Sheets for accurate coupon/loyalty eligibility
    order_count = 0
    try:
        # Get customer ID from email
        user_row = sqlite_db.fetch_one("SELECT customer_id FROM customers WHERE LOWER(email) = ?", (req.customer_email.strip().lower(),))
        if user_row:
            customer_id = user_row["customer_id"]
            # Count existing orders for this customer
            count_row = sqlite_db.fetch_one("SELECT COUNT(*) as c FROM orders WHERE customer_id = ?", (customer_id,))
            order_count = count_row["c"] if count_row else 0
    except Exception as e:
        print(f">>> Error fetching order count for coupons: {e}")
    
    return pricing_agent.get_pricing_strategy(subtotal, order_count, cart_items_normalized)


@order_router.post("/place-order")
async def place_order(req: OrderRequest):
    """
    Finalizes the order and saves to Google Sheets with correct schema.
    Schema Orders: [Order_ID, Customer_ID, Customer_Name, Order_Price, Order_Created_DateTime, Order_Status]
    Schema Order_Items: [Order_Item_ID, Order_ID, Item_ID, Item_Name, Item_Quantity, Item_Price]
    """
    # 0. Generate Sequential Order ID
    order_id = _get_next_sequential_id("orders", "order_id", "Ord")
    timestamp = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    
    try:
        # 0. Look up Customer details from Customer_Auth (Normalized)
        target_email = req.customer_email.strip().lower()
        user_row = sqlite_db.fetch_one("SELECT customer_id, name FROM customers WHERE LOWER(email) = ?", (target_email,))
        customer_id = user_row["customer_id"] if user_row else "Unknown"
        customer_name = user_row["name"] if user_row else "Unknown"

        # 1. Save to Orders Table
        sqlite_db.insert("orders", {
            "order_id": order_id,
            "customer_id": customer_id,
            "order_price": req.final_total,
            "created_at": timestamp,
            "status": "CREATED",
            "table_number": req.table_number or "N/A"
        })
        
        # 2. Save to Order_Items Table
        for idx, item in enumerate(req.cart_items, 1):
            order_item_id = f"{order_id}_Item_{str(idx).zfill(4)}"
            
            # Use frontend names or fallbacks
            item_id = item.Item_ID or item.id or "Unknown"
            sqlite_db.insert("order_items", {
                "order_item_id": order_item_id,
                "order_id": order_id,
                "item_id": item_id,
                "quantity": item.quantity,
                "price": item.Current_Price or item.price or 0.0
            })
        
        # ===================================================================
        # 🤖 TRIGGER CATEGORIZATION AGENT
        # Automatically categorize the customer after order placement
        # ===================================================================
        try:
            from agents.categorization import categorize_single_customer
            
            print(f"\n🤖 Triggering categorization for customer: {customer_id}")
            categorization_success = categorize_single_customer(customer_id)
            
            if categorization_success:
                print(f"✅ Categorization completed successfully for customer {customer_id}")
            else:
                print(f"⚠️ Categorization failed for customer {customer_id}, but order was saved")
                
        except Exception as e:
            # Fail-safe: Don't let categorization errors break order placement
            print(f"⚠️ Categorization error for customer {customer_id}: {e}")
            
        return {"status": "success", "order_id": order_id, "message": "Order placed successfully"}
        
    except Exception as e:
        print(f"Order Placement Error: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Failed to place order")

@order_router.get("/order-history/{email}")
async def get_order_history(email: str):
    """
    Fetches order history for a specific customer.
    Joins Orders and Order_Items.
    """
    try:
        user_row = sqlite_db.fetch_one("SELECT customer_id FROM customers WHERE LOWER(email) = ?", (email.strip().lower(),))
        if not user_row:
            return {"orders": []}
            
        customer_id = user_row["customer_id"]
        orders = sqlite_db.fetch_all("SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC", (customer_id,))
        
        formatted_orders = []
        for o in orders:
            order_id = o["order_id"]
            items_res = sqlite_db.fetch_all("""
                SELECT oi.quantity, oi.price, m.name as item_name
                FROM order_items oi
                LEFT JOIN menu m ON oi.item_id = m.item_id
                WHERE oi.order_id = ?
            """, (order_id,))
            
            # Convert timestamp back to something frontend likes (or keep as string)
            # Schema: Order_Created_DateTime
            items = []
            for itm in items_res:
                items.append({
                    "name": itm.get("item_name", "Unknown"),
                    "quantity": int(itm.get("quantity", 1)),
                    "price": float(itm.get("price", 0))
                })
            
            formatted_orders.append({
                "id": order_id,
                "date": o.get("created_at", ""),
                "items": items,
                "total": float(o.get("order_price", 0)),
                "status": o.get("status", "CREATED").lower()
            })
            
        return {"orders": formatted_orders}
        
    except Exception as e:
        print(f"Fetch Order History Error: {e}")
        return {"orders": []}

@order_router.get("/coupons")
def get_coupons():
    return {"coupons": pricing_agent._get_coupons(0, 0)}

@order_router.post("/call-waiter")
async def call_waiter(req: dict):
    # If there's no waiter_calls table in sqlite yet, just pretend to log or ignore
    # Or create the table here. For safety we just print.
    print(f">> Call Waiter from table {req.get('table_number')}")
    return {"status": "success", "message": "Waiter has been notified"}


@order_router.get("/active-order/{table_number}")
async def get_active_order(table_number: str):
    """Fetches the most recent active order for a table."""
    try:
        latest = sqlite_db.fetch_one("SELECT * FROM orders WHERE table_number = ? ORDER BY created_at DESC LIMIT 1", (str(table_number),))

        if not latest:
            return {"order": None}

        # Get the latest order
        order_id = latest["order_id"]

        items_res = sqlite_db.fetch_all("""
            SELECT oi.quantity, oi.price, m.name as item_name 
            FROM order_items oi 
            LEFT JOIN menu m ON oi.item_id = m.item_id 
            WHERE oi.order_id = ?
        """, (order_id,))

        items = []
        for itm in items_res:
             items.append({
                "name": itm.get("item_name", "Unknown"),
                "quantity": int(itm.get("quantity", 1)),
                "price": float(itm.get("price", 0)),
             })

        return {
            "order": {
                "id":        order_id,
                "status":    latest.get("status", "CREATED"),
                "total":     float(latest.get("order_price", 0)),
                "timestamp": latest.get("created_at", ""),
                "items":     items,
            }
        }
    except Exception as e:
        print(f"Active Order Error: {e}")
        return {"order": None}
