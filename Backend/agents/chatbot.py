# DineIQ\Backend\agents\chatbot.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
import os, re
# import google.generativeai as genai
# import httpx  # async HTTP client
# import json
from fastapi import APIRouter
# from fastapi import Request
from pydantic import BaseModel
from datetime import datetime, timezone

# -------------------------------------------------------------------
# 🔧 SETUP KEYS and URLs
# -------------------------------------------------------------------
from dotenv import load_dotenv

load_dotenv()

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "").strip()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID", "").strip()
APPS_SCRIPT_URL = os.environ.get("APPS_SCRIPT_URL", "").strip()

# ---------------------------------------------------------
# Sheets Client
# ---------------------------------------------------------
from services.sheets import SheetsClient
sheets_client = SheetsClient(spreadsheet_id=os.getenv("SPREADSHEET_ID"))

CHATS_SHEET = "Chats"
CUSTOMER_AUTH_SHEET = "Customer_Auth"

# ---------------------------------------------------------
# Router
# ---------------------------------------------------------
chatbot_router = APIRouter()

# ---------------------------------------------------------
# REQUEST / RESPONSE MODELS
# ---------------------------------------------------------
class FrontendChatItem(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    chatHistory: list[FrontendChatItem]
    userMessage: str
    clientName: str | None = "Guest"

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

# ---------------------------------------------------------
# SYSTEM PROMPT FOR RESTAURANT IN-ROOM DINING CHATBOT
# ---------------------------------------------------------
SYSTEM_PROMPT = """
You are a highly professional restaurant concierge AI assistant

Your objectives:

Respond to a customer (or potential customer) inquiring about restaurant in-room dinning.
Respond politely, warmly, and naturally.
Always address the client by their name (if provided).
Maintain memory of all previous chat messages in the session.
Your tone: friendly, concise, human-like, professional.
Provide accurate, helpful, and friendly information about the restaurant.
DO NOT mention that you are an AI unless the user explicitly asks.
Your role is ONLY to respond to the client.
    Do not return JSON or metadata. Return ONLY the reply message.

Your first response can include asking client's name, phone and email, to be able to extract all client information.
    
You can not clarify queries regarding:
- Reservations
- Tables information
- Food Recommendations
- Cancellations
- Any other non-dining related queries
In such cases, you can politely inform the customer about your limitation.

There is a restaurant database stored in a google sheets document, named as DineIQ_DB.
Refer 'Menu' sheet for any menu-related or price-related questions.
Provide price details only when asked.

Refer 'Customer_Auth' sheet to see if he/she is a registered customer.
If the customer is a registered customer, greet them warmly and offer personalized assistance.
If the customer is not registered, politely suggest them to register for a better experience.

Always prioritize customer satisfaction and provide exceptional service.

"""
# ---------------------------------------------------------
# FORMAT MESSAGES FOR GEMINI
# ---------------------------------------------------------
def convert_messages(history, system_prompt, client_name):
    messages = [
        {
            "role": "user",
            "parts": [{
                "text": system_prompt.replace("{clientName}", client_name)
            }]
        }
    ]

    for item in history:
        role = "model" if item.role == "ai" else "user"

        messages.append({
            "role": role,
            "parts": [{"text": item.text}]
        })

    return messages

# -----------------------------
# Health Check (Optional)
# -----------------------------
@chatbot_router.get("/health")
def health():
    return {"chatbot backend deployment status": "ok"}

# ---------------------------------------------------------
# LLM CHAT ENDPOINT
# ---------------------------------------------------------
@chatbot_router.post("/llm-chat", response_model=ChatResponse)
async def llm_chat(req: ChatRequest):
    print("\n🔥 /llm-chat endpoint HIT")

    messages = convert_messages(
        req.chatHistory,
        SYSTEM_PROMPT,
        req.clientName or "Guest"
    )

    # append fresh user message
    messages.append({
        "role": "user",
        "parts": [{"text": req.userMessage}]
    })

    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)

    try:
        model = genai.GenerativeModel(model_name=GEMINI_MODEL)
        response = model.generate_content(contents=messages)
        ai_reply = response.text
    except Exception as e:
        print("❌ Gemini API error:", e)
        return ChatResponse(response=str(e))

    return ChatResponse(response=ai_reply)


# ---------------------------------------------------------
# Helper: Find customer in Customer_Auth
# ---------------------------------------------------------
def find_customer_id(email: str, phone: str):
    """
    Returns Customer_ID if email or phone matches.
    Otherwise returns None.
    """
    rows = sheets_client.read_sheet_rows("Customer_Auth")

    for r in rows:
        sheet_email = (r.get("Customer_Email") or "").strip().lower()
        sheet_phone = (r.get("Customer_Phone") or "").strip()

        if email and email.lower() == sheet_email:
            return r.get("Customer_ID")

        if phone and phone == sheet_phone:
            return r.get("Customer_ID")

    return None

# ---------------------------------------------------------
# Helper: Get next Chat ID
# ---------------------------------------------------------
def generate_next_chat_id():
    """
    Reads Chats sheet and returns next Chat_ID
    in format: Chat_00001
    """
    try:
        rows = sheets_client.read_sheet_rows("Chats")
    except Exception:
        rows = []

    max_num = 0

    for r in rows:
        chat_id = r.get("Chat_ID", "")
        match = re.search(r"Chat_(\d+)", chat_id)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num

    next_num = max_num + 1
    return f"Chat_{str(next_num).zfill(5)}"

# ---------------------------------------------------------
# SAVE CHAT SESSION ENDPOINT
# ---------------------------------------------------------
@chatbot_router.post("/save-chat")
async def save_chat(session: ChatSession):
    """
    Receives chat session and saves it only if
    customer exists in Customer_Auth sheet.
    """
    print("\n🔥 /save-chat endpoint HIT")
    print("📥 Received chat session:", session.model_dump())

    try:
        # 1️⃣ Find existing customer
        customer_id = find_customer_id(
            session.clientEmail,
            session.clientPhone
        )

        print("Client ID: ", session.clientId)
        print("Client Name: ", session.clientName)
        print("Client Email: ", session.clientEmail)
        print("Client Phone: ", session.clientPhone)

        if not customer_id:
            print("⚠️ Customer not found. Chat not saved.")
            return {
                "status": "ignored",
                "message": "Customer not registered. Chat not saved."
            }

        # 2️⃣ Generate next Chat ID
        chat_id = generate_next_chat_id()

        # 3️⃣ Ensure timestamp
        chat_datetime = session.date
        if not chat_datetime:
            chat_datetime = datetime.now(timezone.utc).isoformat()

        # 4️⃣ Prepare row
        row = [
            chat_id,
            customer_id,
            session.clientName or "",
            session.clientPhone or "",
            session.clientEmail or "",
            chat_datetime,
            session.transcriptText or "",
        ]

        # 5️⃣ Save
        sheets_client.append_row("Chats", row)

        print("✅ Chat session saved:", chat_id)

        return {
            "status": "success",
            "chatId": chat_id,
            "customerId": customer_id
        }

    except Exception as e:
        print("❌ ERROR saving chat:", e)
        return {
            "status": "error",
            "message": str(e)
        }


# ---------------------------------------------------------
# Python-based port reading
# ---------------------------------------------------------
# if __name__ == "__main__":
#     import os, uvicorn
#     port = int(os.environ.get("PORT", 8080))
#     uvicorn.run("app:app", host="0.0.0.0", port=port)