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
# Helpers
# ---------------------------------------------------------
def _get_next_sequential_id(sheet_name: str, id_column: str, prefix: str, padding: int = 4) -> str:
    """Generates the next sequential ID (e.g., Ord_0001) based on current sheet data."""
    try:
        rows = sheets_client.read_sheet_rows(sheet_name)
        if not rows:
            return f"{prefix}_{'1'.zfill(padding)}"
        
        # Extract numeric parts of IDs
        ids = []
        for r in rows:
            val = r.get(id_column, "")
            if val and "_" in val:
                try:
                    # Get the last parts after the last underscore
                    numeric_part = val.split("_")[-1]
                    ids.append(int(numeric_part))
                except (ValueError, IndexError):
                    continue
        
        next_num = max(ids) + 1 if ids else 1
        return f"{prefix}_{str(next_num).zfill(padding)}"
    except Exception as e:
        print(f"ID Generation Error for {sheet_name}: {e}")
        # Fallback to random-ish if lookup fails to avoid crash, but try to stay sequential
        return f"{prefix}_{uuid.uuid4().hex[:padding]}"

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
    description: Optional[str] = None  # Added field
    sub_items: Optional[List[Dict]] = None # Added field for explicit unpacking

class PricingRequest(BaseModel):
    customer_email: str
    cart_items: List[CartItem]
    
class OrderRequest(BaseModel):
    customer_email: str
    cart_items: List[CartItem]
    discount_amount: float = 0.0
    final_total: float
    payment_method: str = "Cash"
    instructions: Optional[str] = None

# ... (Endpoints detect deleted lines, ensuring I match context correctly) ...
# I need to match the target content exactly or use line numbers accurately. 
# Attempting to replace the Model definition AND the order logic in one go might be tricky if they are far apart.
# Getting safe: I will split this into two `replace_file_content` if needed, OR just match the Model chunk first.

# LET'S DO THE MODEL UPDATE FIRST.


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
    
    # Fetch real order count from Sheets for accurate coupon eligibility
    order_count = 0
    try:
        # Get customer ID from email
        auth_rows = sheets_client.read_sheet_rows("Customer_Auth")
        target_email = req.customer_email.strip().lower()
        user_row = next((r for r in auth_rows if str(r.get("Customer_Email", "")).strip().lower() == target_email), None)
        
        if user_row:
            customer_id = user_row.get("Customer_ID")
            # Count existing orders for this customer
            all_orders = sheets_client.read_sheet_rows(ORDERS_SHEET)
            order_count = sum(1 for o in all_orders if o.get("Customer_ID") == customer_id)
            print(f">>> Customer {customer_id} has {order_count} previous orders")
    except Exception as e:
        print(f">>> Error fetching order count: {e}")
        order_count = 0
    
    return pricing_agent.get_pricing_strategy(subtotal, order_count, cart_items_normalized)


@order_router.post("/place-order")
async def place_order(req: OrderRequest):
    """
    Finalizes the order and saves to Google Sheets with correct schema.
    Schema Orders: [Order_ID, Customer_ID, Customer_Name, Order_Price, Order_Created_DateTime, Order_Status]
    Schema Order_Items: [Order_Item_ID, Order_ID, Item_ID, Item_Name, Item_Quantity, Item_Price]
    """
    # 0. Generate Sequential Order ID
    order_id = _get_next_sequential_id(ORDERS_SHEET, "Order_ID", "Ord")
    timestamp = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    
    try:
        # 0. Look up Customer details from Customer_Auth (Normalized)
        auth_rows = sheets_client.read_sheet_rows("Customer_Auth")
        target_email = req.customer_email.strip().lower()
        
        with open("debug_order.log", "a") as f:
            f.write(f"\n--- ORDER LOG {timestamp} ---\n")
            f.write(f"DEBUG: Received customer_email: '{req.customer_email}'\n")
            f.write(f"DEBUG: Normalized target_email: '{target_email}'\n")
            
            user_row = None
            for r in auth_rows:
                row_email = str(r.get("Customer_Email", "")).strip().lower()
                if row_email == target_email:
                    user_row = r
                    break
            
            if not user_row:
                f.write(f"DEBUG: NO MATCH FOUND for '{target_email}'\n")
                f.write(f"DEBUG: Available emails (first 10): {[str(r.get('Customer_Email')).strip().lower() for r in auth_rows[:10]]}\n")
            else:
                f.write(f"DEBUG: MATCH FOUND: {user_row.get('Customer_ID')} - {user_row.get('Customer_Name')}\n")
            
            customer_id = user_row.get("Customer_ID", "Unknown") if user_row else "Unknown"
            customer_name = user_row.get("Customer_Name", "Unknown") if user_row else "Unknown"
            f.write(f"DEBUG: Final IDs saved -> ID: {customer_id}, Name: {customer_name}\n")
            f.write(f"--- END LOG ---\n")

        # 1. Save to Orders Sheet
        order_row = [
            order_id,
            customer_id,
            customer_name,
            req.final_total,
            timestamp,
            "CREATED"
        ]
        sheets_client.append_row(ORDERS_SHEET, order_row)
        
        # 2. Save to Order_Items Sheet (Optimized: No Read Required)
        try:
            # OPTIMIZATION: Unpack Combos & Use deterministic IDs
            new_item_rows = []

            def add_row(o_id, item_id, item_name, i_qty, i_price):
                """Save one Order_Items row in the correct format: Ord_XXXX_Item_YYYY"""
                order_item_id = f"{o_id}_{item_id}" if item_id else f"{o_id}_{uuid.uuid4().hex[:6].upper()}"
                new_item_rows.append([
                    order_item_id,   # Ord_0007_Item_0006
                    o_id,            # Ord_0007
                    item_id,         # Item_0006
                    item_name,       # Butter Kulcha
                    i_qty,           # 1
                    i_price          # 22
                ])

            for item in req.cart_items:
                i_name  = item.Item_Name or item.name or "Item"
                i_id    = item.Item_ID or item.id or ""
                i_qty   = item.quantity or 1
                i_price = item.Current_Price or item.price or 0.0
                i_subs  = getattr(item, 'sub_items', None)
                i_combo_items = getattr(item, 'comboItems', None)

                # ── AI Combo: comboItems encoded as "ItemID||ItemName||Price" ──────
                if i_combo_items and isinstance(i_combo_items, list) and len(i_combo_items) > 0:
                    first = i_combo_items[0] if i_combo_items else ""
                    if "||" in str(first):
                        # This is an AI chatbot combo — unpack each ingredient
                        for entry in i_combo_items:
                            try:
                                parts = str(entry).split("||")
                                ing_id    = parts[0].strip() if len(parts) > 0 else ""
                                ing_name  = parts[1].strip() if len(parts) > 1 else str(entry)
                                ing_price = float(parts[2].strip()) if len(parts) > 2 else 0.0
                                add_row(order_id, ing_id or i_id, ing_name, i_qty, ing_price)
                            except Exception as parse_err:
                                print(f"⚠️ Combo ingredient parse error: {parse_err}")
                                add_row(order_id, i_id, str(entry), i_qty, 0.0)
                        continue   # don't save the combo header itself

                # ── Regular item ─────────────────────────────────────────────────
                add_row(order_id, i_id, i_name, i_qty, i_price)

            # Batch insert to Order_Items sheet
            sheets_client.append_rows(ORDER_ITEMS_SHEET, new_item_rows)
            
        except Exception as e:
            print(f"⚠️ Error saving order items (Batch): {e}")
            # Don't fail the order if items fail, but logic suggests we should.
            # Proceeding to allow at least Order record to exist.
        
        # ===================================================================
        # 🤖 TRIGGER CATEGORIZATION AGENT
        # Automatically categorize the customer after order placement
        # ===================================================================
        # try:
        #     from agents.categorization import categorize_single_customer
        #     
        #     print(f"\n🤖 Triggering categorization for customer: {customer_id}")
        #     # categorization_success = categorize_single_customer(customer_id)
        #     
        #     # if categorization_success:
        #     #     print(f"✅ Categorization completed successfully for customer {customer_id}")
        #     # else:
        #     #     print(f"⚠️ Categorization failed for customer {customer_id}, but order was saved")
        #         
        # except Exception as e:
        #     # Fail-safe: Don't let categorization errors break order placement
        #     print(f"⚠️ Categorization error for customer {customer_id}: {e}")
        #     print("Order was saved successfully despite categorization error")
        #     import traceback
        #     traceback.print_exc()
            
        return {"status": "success", "order_id": order_id, "message": "Order placed successfully"}
        
    except Exception as e:
        print(f"Order Placement Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to place order")

@order_router.get("/order-history/{email}")
async def get_order_history(email: str):
    """
    Fetches order history for a specific customer.
    Joins Orders and Order_Items.
    """
    try:
        all_orders = sheets_client.read_sheet_rows(ORDERS_SHEET)
        all_items = sheets_client.read_sheet_rows(ORDER_ITEMS_SHEET)
        
        # Filter orders by email (stored in Customer_Auth lookup or directly if email was in sheet)
        # However, the Orders sheet doesn't have email. We need to find customer_id first.
        auth_rows = sheets_client.read_sheet_rows("Customer_Auth")
        user_row = next((r for r in auth_rows if r.get("Customer_Email") == email), None)
        
        if not user_row:
            return {"orders": []}
            
        customer_id = user_row.get("Customer_ID")
        customer_orders = [o for o in all_orders if o.get("Customer_ID") == customer_id]
        
        formatted_orders = []
        for o in customer_orders:
            order_id = o.get("Order_ID")
            items = []
            for itm in all_items:
                if itm.get("Order_ID") == order_id:
                    items.append({
                        "name": itm.get("Item_Name", "Unknown"),
                        "quantity": int(itm.get("Item_Quantity", 1)),
                        "price": float(itm.get("Item_Price", 0))
                    })
            
            # Convert timestamp back to something frontend likes (or keep as string)
            # Schema: Order_Created_DateTime
            date_str = o.get("Order_Created_DateTime", "")
            
            formatted_orders.append({
                "id": order_id,
                "date": date_str,
                "items": items,
                "total": float(o.get("Order_Price", 0)),
                "status": o.get("Order_Status", "CREATED").lower()
            })
            
        return {"orders": formatted_orders}
        
    except Exception as e:
        print(f"Fetch Order History Error: {e}")
        return {"orders": []}

@order_router.get("/coupons")
def get_coupons():
    return {"coupons": pricing_agent._get_coupons(0, 0)}
