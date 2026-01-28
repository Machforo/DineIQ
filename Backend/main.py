# ----------------------------------------------------------------------------
# This is the main python file which talks to rest of the elements or agents.
# ----------------------------------------------------------------------------

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

# Agents
# import agent classes
# from services.auth_service          import AuthService
# from services.profile_service       import ProfileService
# from services.cart_service          import CartService
# from services.order_service         import OrderService

from agents.menu                    import MenuAgent
# from agents.pricing                 import PricingAgent
# from agents.recommendation          import RecommendationAgent
# from agents.monitoring              import MonitoringAgent
# from agents.chat                    import ChatAgent
# from agents.campaign                import CampaignService

# Initialize FastAPI app
app = FastAPI(title="In-Room Dining Agentic AI API")

# Initialize agents
# auth_service            = AuthService()
# profile_service         = ProfileService()
# cart_service            = CartService()
# order_service           = OrderService()

menu_agent              = MenuAgent()
# pricing_agent           = PricingAgent()
# recommendation_agent    = RecommendationAgent()
# monitoring_agent        = MonitoringAgent()
# chat_agent              = ChatAgent()
# campaign_service        = CampaignService()

# -----------------------------
# Request / Response Models
# -----------------------------
class LoginRequest(BaseModel):
    email: str
    password: str

class Profile(BaseModel):
    full_name: str
    mobile_number: str
    email_address: str
    date_of_birth: Optional[str] = None

class CartItem(BaseModel):
    dish_id: str
    quantity: int

class OrderRequest(BaseModel):
    items: List[CartItem]
    delivery_notes: Optional[str] = None


class ChatRequest(BaseModel):
    chatHistory: list    # list of {role: "user"/"assistant", text: "..."}
    userMessage: str
    customerName: str | None = "Guest"   # Optional: frontend can send the name

class ChatResponse(BaseModel):
    response: str

class ChatSession(BaseModel):
    clientId: str
    chatId: str
    clientName: str
    clientEmail: str
    clientPhone: str
    date: str
    time: str
    transcriptText: str

class Campaign(BaseModel):
    campaign_text: str
    target_category: str
    start_datetime: str
    end_datetime: str
    message_count: int
    campaign_type: str
    campaign_status: str
    message_templates: List[str]
    message_send_timings: List[str]

# -----------------------------
# API Endpoints
# login
# home
# profile
# orders
# track-order
# cart
# payment
# order-success

# llm-chat
# campaign
# -----------------------------

# ---------------------------------------------------------------------------------------
# post endpoint: login
# frontend:
# - sends a customer's name, phone number, email address and password
# backend:
# - checks if customer exists in DB.
# - if the customer exists in DB, identifies the record in DB
# - if the customer is new, creates a new customer ID record in DB
# - generates an otp, saves customer's details in respective customer ID record in DB, send otp to customer's email/phone
# - verifies the otp entered by customer
# DB:
# - Customer_Auth sheet: Customer_ID, Customer_Name, Customer_Email, Customer_Phone, Date_of_Birth, OTP_Hash, OTP_Expires_At, Creation_DateTime, Last_Login_DateTime, Customer_Category
#   - all the fields except Date_of_Birth and Customer_Category are populated during login
# ---------------------------------------------------------------------------------------
@app.post("/login")
def login(request: LoginRequest):
    # user = auth_service.authenticate(request.email, request.password)
    # if not user:
    #     raise HTTPException(status_code=401, detail="Invalid credentials")
    # return {"message": "Login successful", "user": user}
    return

# ---------------------------------------------------------------------------------------
# get endpoint: home
# frontend:
# - requests the following data to display on home page:
#   - Category filters
#   - Smart Combos
#   - Personalized Recommendations
#   - Customized menu
# backend:
# - fetches the data from respective agents
# DB:
# - No updates to DB
# ---------------------------------------------------------------------------------------
@app.get("/home")
def home(customer_id: str):
    """
    Returns:
    - Category filters (future)
    - Smart Combos (future)
    - Personalized Recommendations (future)
    - All Dishes
    """
    
    # place holders
    customer_id = customer_id
    
    # smart_combos = menu_agent.get_smart_combos(customer_id)
    # recommendations = recommendation_agent.get_recommendations(customer_id)
    all_dishes = menu_agent.get_menu()

    return {
        # "category_filters": [],          # placeholder
        # "smart_combos": [],              # placeholder
        # "recommendations": [],           # placeholder
        "all_dishes": all_dishes
    }

# ---------------------------------------------------------------------------------------
# post endpoint: update-cart
# frontend:
# - sends the updated cart to backend, as and when customer adds/removes items from cart
# - sends item(s) and quantity(ies), along with customer profile (name, phone number, email address)
# backend:
# - creates a new order ID record for the respective customer ID in DB
# - updates the order details in DB against the respective order ID record
# - updates the order status as CREATED
# - creates a new order items record for the respective order ID in DB
# - updates the order items details in DB against the respective order items record
# DB:
# - Orders sheet: Order_ID, Customer_ID, Customer_Name, Order_Price, Order_Created_DateTime, Order_Status
# - Order_Items sheet: Order_Item_ID	Order_ID	Item_ID	Item_Name	Item_Quantity	Item_Price
#   - all the fields in both sheets are populated/updated during cart update
# ---------------------------------------------------------------------------------------
@app.post("/update-cart")
def update_cart(customer_id: str, items: List[CartItem]):
    # place holders
    customer_id = customer_id
    items = items
    # updated_cart = cart_service.update_cart(customer_id, items)
    # return {"message": "Cart updated", "cart": updated_cart}
    return

# ---------------------------------------------------------------------------------------
# get endpoint: get-cart
# frontend:
# requests the updated cart from backend
# requests item(s) and quantity(ies) in the cart
# backend:
# fetches the cart details from DB against the respective customer profile (name, phone number, email address)
# DB:
# - no updates to DB
# ---------------------------------------------------------------------------------------
@app.get("/get-cart")
def get_cart(customer_id: str):
    # cart = cart_service.get_cart(customer_id)
    # return {"cart": cart}
    return

# ---------------------------------------------------------------------------------------
# post endpoint: update-profile
# frontend:
# - sends updated customer's profile details (phone number, email address, DOB) to backend
# backend:
# - updates the customer's profile details (phone number, email address, DOB) in DB against the respective customer profile (name, phone number, email address)
# DB:
# - Customer_Auth sheet: Customer_ID, Customer_Name, Customer_Email, Customer_Phone, Date_of_Birth, OTP_Hash, OTP_Expires_At, Creation_DateTime, Last_Login_DateTime, Customer_Category
#   - updated fields are one or more from Customer_Phone, Customer_Email, Date_of_Birth during profile update
# ---------------------------------------------------------------------------------------
@app.post("/update-profile")
def update_profile(customer_id: str, profile: Profile):
    # place holders
    customer_id = customer_id
    profile = profile
    # updated_profile = profile_service.update_profile(customer_id, profile)
    # return {"message": "Profile updated successfully", "profile": updated_profile}
    return

# ---------------------------------------------------------------------------------------
# get endpoint: get-profile
# frontend:
# - requests the customer's profile details (name, phone number, email address, DOB) from backend
# backend:
# - fetches the profile details from DB against the respective customer profile (name, phone number, email address)
# DB:
# - no updates to DB
# ---------------------------------------------------------------------------------------
@app.get("/get-profile")
def get_profile(customer_id: str):
    # profile_data = profile_service.get_profile(customer_id)
    # return {"profile": profile_data}
    return

# ---------------------------------------------------------------------------------------
# get endpoint: orders
# frontend:
# requests the orders history from backend
# requests order(s), item(s), quantity(ies), price(s) in orders history
# provides an option to repeat an order from order history
# backend:
# fetches the orders history details from DB against the respective customer profile (name, phone number, email address)
# DB:
# - no updates to DB
# ---------------------------------------------------------------------------------------
@app.get("/orders")
def orders(customer_id: str):
    # order_history = order_service.get_order_history(customer_id)
    # return {"orders": order_history}
    return

# ---------------------------------------------------------------------------------------
# get endpoint: track-order
# frontend:
# requests the order status from backend
# backend:
# checks if an order was placed by the customer
# if order exists, fetches the latest order status from DB against the respective customer profile (name, phone number, email address)
# if order does not exist, returns an error message "Order not found"
# DB:
# - no updates to DB
# ---------------------------------------------------------------------------------------
@app.get("/track-order")
def track_order(order_id: str):
    # status = order_service.track_order(order_id)
    # if not status:
    #     raise HTTPException(status_code=404, detail="Order not found")
    # return {"order_id": order_id, "status": status}
    return

# ---------------------------------------------------------------------------------------
# post endpoint: payment
# frontend:
# backend:
# DB:
# ---------------------------------------------------------------------------------------
@app.post("/update-payment")
def update_payment_inputs(customer_id: str, total_amount: int, cash_payment: bool, online_payment: bool):
    # place holders
    customer_id = customer_id
    total_amount = total_amount
    cash_payment = cash_payment
    online_payment = online_payment
    # return {"message": "Payment details updated successfully"}
    return

# ---------------------------------------------------------------------------------------
# get endpoint: payment
# frontend:
# backend:
# DB:
# ---------------------------------------------------------------------------------------
@app.get("/get-payment")
def get_payment_inputs(customer_id: str):
    # place holders
    customer_id = customer_id
    # return {"total_amount": None, "cash_payment": False, "online_payment": False}
    return

# ---------------------------------------------------------------------------------------
# post endpoint: order-success
# frontend:
# backend:
# DB:
# ---------------------------------------------------------------------------------------
@app.post("/order-success")
def update_order_success(customer_id: str):
    # place holders
    customer_id = customer_id
    # return {"message": "Order completed successfully"}
    return

# -----------------------------
# Health Check (Optional)
# -----------------------------
@app.get("/health")
def health():
    return {"status": "ok"}

# ---------------------------------------------------------------------------------------
# post endpoint: llm-chat
# frontend:
# - provides a customer chat session text
# - expects chat responses for each individual customer chat in a session
# backend:
# - processes the chat session text using LLM to generate responses
# - fetches the chat responses from LLM for each individual customer chat in a session
# DB:
# - no updates to DB
# ---------------------------------------------------------------------------------------
@app.post("/llm-chat", response_model=ChatResponse)
async def llm_chat(req: ChatRequest):
    # place holders
    req = req
    return

# ---------------------------------------------------------------------------------------
# post endpoint: end-chat
# frontend:
# - informs that the customer chat session has ended
# backend:
# - creates a new chat ID record for the respective customer ID in DB
# - updates the chat session details in DB against the respective chat ID record
# DB:
# - Chats sheet: Chat_ID, Customer_ID, Customer_Name, Customer_Phone, Customer_Email, Chat_Date_Time, Chat_Session_Text
#   - chat session records (if any) are stored in DB against the respective customer profile (name, phone number, email address)
# ---------------------------------------------------------------------------------------
@app.post("/end-chat")
def end_chat(end_chat: bool):
    # place holders
    end_chat = end_chat
    # return {"message": "Chat session ended and data saved successfully"}
    return

# ---------------------------------------------------------------------------------------
# post endpoint: campaign
# frontend:
# - sends all the fields from a campaign form filled by marketing team
# backend:
# - creates a new campaign ID record in DB
# - updates the campaign details in DB against the respective campaign ID record
# DB:
# Campaigns sheet: Campaign_ID, Campaign_Text, Target_Customer_Category, Campaign_Start_DateTime, Campaign_End_DateTime, Campaign_Message_Count, Campaign_Type, Campaign_Status, Message_Template(s), Message_Send_Timing(s)
#  - all the fields except campaign ID and campaign status are populated in the Campaigns sheet during campaign creation
# ---------------------------------------------------------------------------------------
@app.post("/add-campaign")
def add_campaign(campaign: Campaign):
    # place holders
    campaign = campaign
    # return {"message": "Campaign data updated successfully"}
    return

