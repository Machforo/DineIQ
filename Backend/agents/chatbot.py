# DineIQ\Backend\agents\chatbot.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
import os, re
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone

# -------------------------------------------------------------------
# 🔧 SETUP KEYS and URLs
# -------------------------------------------------------------------
from dotenv import load_dotenv

load_dotenv()

SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID", "").strip()

# ---------------------------------------------------------
# Menu Agent
# ---------------------------------------------------------
from agents.menu import MenuAgent
menu_agent = MenuAgent()

# ---------------------------------------------------------
# llm Client
# ---------------------------------------------------------
from services.llm import GeminiClient
gemini_client = GeminiClient()

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
# SYSTEM PROMPT
# ---------------------------------------------------------
SYSTEM_PROMPT = """
You are a highly professional restaurant concierge AI assistant

Your objectives:
- Respond politely, warmly, and naturally.
- Always address the client by their name (if provided).
- Maintain memory of previous chat messages.
- Tone: friendly, concise, human-like, professional.
- Provide accurate and helpful information.
- Ask for Name, Email or Phone if not yet provided, but not for registration or signup.

Rules:
- Use menu data if provided.
- Do NOT invent menu items or prices.
- Do NOT mention being an AI.
- You are not here to take any orders or reservation requests.
- If customer not registered, suggest registration politely.
- Return ONLY the reply message (no JSON, no metadata).

For any Any other queries such as Reservations, Tables information, Cancellations, you can politely inform the customer about your limitation.

"""

# ---------------------------------------------------------
# MENU INTENT DETECTION
# ---------------------------------------------------------
MENU_KEYWORDS = [
    "menu",
    "dish",
    "food",
    "eat",
    "price",
    "cost",
    "veg",
    "non veg",
    "vegetarian",
    "recommend",
    "order",
    "special",
]

def is_menu_query(message: str) -> bool:
    msg = message.lower()
    return any(word in msg for word in MENU_KEYWORDS)

# ---------------------------------------------------------
# Helper: Find customer in Customer_Auth
# ---------------------------------------------------------
def find_customer_id(email: str, phone: str):
    """
    Returns Customer_ID if email or phone matches.
    Otherwise returns None.
    """
    rows = sheets_client.read_sheet_rows(CUSTOMER_AUTH_SHEET)

    for r in rows:
        sheet_email = (r.get("Customer_Email") or "").strip().lower()
        sheet_phone = (r.get("Customer_Phone") or "").strip()

        if email and email.lower() == sheet_email:
            return r.get("Customer_ID")

        if phone and phone == sheet_phone:
            return r.get("Customer_ID")

    return None


# ---------------------------------------------------------
# Helper: FORMAT PROMT FOR GEMINI
# ---------------------------------------------------------
def build_prompt(history, system_prompt, client_name, user_message, menu_context=""):
    """
    Convert chat history into a single text prompt
    for LLM service.
    """
    lines = [system_prompt.replace("{clientName}", client_name), "\nConversation:\n"]

    for item in history:
        role = "Assistant" if item.role == "ai" else "User"
        lines.append(f"{role}: {item.text}")

    if menu_context:
        lines.append("\nAvailable Menu Items:")
        lines.append(menu_context)

    # latest message
    lines.append(f"User: {user_message}")
    lines.append("Assistant:")

    return "\n".join(lines)

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

    try:
        # 1️⃣ Check if customer exists
        # customer_id = find_customer_id(
        #     req.clientEmail,
        #     req.clientPhone
        # )

        # 2️⃣ Detect menu intent
        menu_context = ""

        if is_menu_query(req.userMessage):
            print("🍽️ Menu query detected")

            # if customer_id:
            #     menu = menu_agent.get_customized_menu(customer_id)
            # else:
                # menu = menu_agent.get_menu()
            menu = menu_agent.get_menu()

            # Limit size
            # menu = menu[:20]

            menu_lines = []
            for item in menu:
                price = item.get("price")
                price_str = f"₹{price}" if price else "Price on request"
                menu_lines.append(f"- {item['name']} ({price_str})")

            menu_context = "\n".join(menu_lines)

        # 3️⃣ Build final prompt
        prompt = build_prompt(
            req.chatHistory,
            SYSTEM_PROMPT,
            req.clientName or "Guest",
            req.userMessage,
            menu_context
        )

        # 4️⃣ Call LLM service
        ai_reply = gemini_client.call_gemini_with_retry(prompt)

        if not ai_reply:
            raise Exception("Empty response from LLM")

        return ChatResponse(response=ai_reply)

    except Exception as e:
        print("❌ LLM error:", e)
        return ChatResponse(response="Sorry, something went wrong.")

# ---------------------------------------------------------
# Helper: Generate next Chat ID
# ---------------------------------------------------------
def generate_next_chat_id():
    try:
        rows = sheets_client.read_sheet_rows(CHATS_SHEET)
    except Exception:
        rows = []

    max_num = 0

    for r in rows:
        chat_id = r.get("Chat_ID", "")
        match = re.search(r"Chat_(\d+)", chat_id)
        if match:
            num = int(match.group(1))
            max_num = max(max_num, num)

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

        # test
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
        sheets_client.append_row(CHATS_SHEET, row)

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