# DineIQ\Backend\agents\chatbot.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
import os
import google.generativeai as genai
import httpx  # async HTTP client
import json
# from fastapi import FastAPI
from fastapi import APIRouter
from fastapi import Request
# from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# -------------------------------------------------------------------
# 🔧 SETUP KEYS and URLs
# -------------------------------------------------------------------
from dotenv import load_dotenv

load_dotenv()

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "").strip()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
APPS_SCRIPT_URL = os.environ.get("APPS_SCRIPT_URL", "").strip()

# ---------------------------------------------------------
# Initialize FastAPI app
# ---------------------------------------------------------
# app = FastAPI()
chatbot_router = APIRouter()

# origins = [
#     "http://localhost:8080", # Vite dev
#     "http://127.0.0.1:8080",
#     "http://localhost:8081",
#     "http://127.0.0.1:8081",
#     "http://localhost:5173", # Vite alt port
#     "http://127.0.0.1:5173",
# ]

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins, #["*"],
#     allow_credentials=False, #True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

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
# SAVE CHAT SESSION ENDPOINT
# ---------------------------------------------------------
@chatbot_router.post("/save-chat")
async def save_chat(request: Request):
    """
    Receives chat session from frontend and forwards it to Apps Script
    so it can be saved in Google Sheets.
    """
    print("\n🔥 /save-chat endpoint HIT")

    try:
        session = await request.json()

        print("📤 Received chat session:", session)

        if not APPS_SCRIPT_URL:
            return {"status": "error", "message": "Apps Script URL not configured"}
        # test print apps script url
        print("APPS_SCRIPT_URL:", APPS_SCRIPT_URL)

        # Forward to Apps Script
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                APPS_SCRIPT_URL,
                json=session,
                headers={"Content-Type": "application/json"},
                timeout=10.0
            )

            # Robust parsing
            resp_text = resp.text.strip()
            try:
                resp_data = json.loads(resp_text)
            except json.JSONDecodeError:
                # fallback: treat raw text as message
                resp_data = {"status": "unknown", "message": resp_text}
                print("⚠️ Warning: Apps Script response not valid JSON, raw text:", resp_text)

            print("📤 Response from Apps Script:", resp_data)

        return {"status": "success", "appsScriptResponse": resp_data}

    except Exception as e:
        print("❌ ERROR saving chat:", e)
        return {"status": "error", "message": str(e)}

# ---------------------------------------------------------
# Python-based port reading
# ---------------------------------------------------------
# if __name__ == "__main__":
#     import os, uvicorn
#     port = int(os.environ.get("PORT", 8080))
#     uvicorn.run("app:app", host="0.0.0.0", port=port)