# DineIQ\Backend\agents\chatbot.py
# ─────────────────────────────────────────────────────────────────────────────
# Agentic Chatbot — Groq-powered, Menu-aware, Combo-generating
#
# ARCHITECTURE (3-step agent loop):
#   Step 1 — INTENT  : Groq LLM reads the user message + history and returns
#                       a structured JSON intent (action + filters).
#   Step 2 — TOOL    : Based on the intent, fetch the real menu from Sheets.
#   Step 3 — RESPOND : Groq LLM receives the menu context and generates the
#                       final user-friendly reply.
# ─────────────────────────────────────────────────────────────────────────────

import os, re, json, asyncio, time
from functools import lru_cache
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# ─── External agents / services ──────────────────────────────────────────────
from agents.menu import MenuAgent
from services.llm import GroqClient
from services.sheets import SheetsClient

# ── Lazy singletons — created on first request, NOT at import time ────────────
# This prevents blocking uvicorn's worker thread during startup while
# `build('sheets', 'v4')` fetches Google's API discovery JSON.
@lru_cache(maxsize=1)
def get_menu_agent_instance() -> MenuAgent:
    return MenuAgent()

@lru_cache(maxsize=1)
def get_groq_client_instance() -> GroqClient:
    return GroqClient()

@lru_cache(maxsize=1)
def get_sheets_client_instance() -> SheetsClient:
    return SheetsClient(spreadsheet_id=os.getenv("SPREADSHEET_ID"))

CHATS_SHEET         = "Chats"
CUSTOMER_AUTH_SHEET = "Customer_Auth"

chatbot_router = APIRouter()

# ── Menu cache (avoids repeated Google Sheets round-trips) ───────────────────
_menu_cache: list[dict] = []
_menu_cache_ts: float   = 0.0
MENU_CACHE_TTL: int     = 300   # seconds (5 minutes)

def get_cached_menu() -> list[dict]:
    global _menu_cache, _menu_cache_ts
    menu_agent = get_menu_agent_instance()
    if _menu_cache and (time.time() - _menu_cache_ts) < MENU_CACHE_TTL:
        print(f"✅ Menu from cache ({len(_menu_cache)} items)")
        return _menu_cache
    print("🔄 Fetching fresh menu from Sheets...")
    _menu_cache    = menu_agent.get_menu()
    _menu_cache_ts = time.time()
    return _menu_cache

# ─── Request / Response models ────────────────────────────────────────────────
class FrontendChatItem(BaseModel):
    role: str
    text: str

class ComboIngredient(BaseModel):
    name: str
    price: float
    item_id: str = ""    # real Item_ID from Google Sheets Menu

class ComboData(BaseModel):
    id: str
    name: str
    items: list[ComboIngredient]
    totalPrice: float
    savings: float = 0.0

class ChatRequest(BaseModel):
    chatHistory: list[FrontendChatItem]
    userMessage: str
    clientName: str | None = "Guest"

class ChatResponse(BaseModel):
    response: str
    combos: list[ComboData] = []   # ← structured combos for frontend cards

class ChatSession(BaseModel):
    clientId:      str
    chatId:        str
    clientName:    str
    clientEmail:   str
    clientPhone:   str
    date:          str
    time:          str
    transcriptText: str

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1 — INTENT CLASSIFIER (LLM-powered, no hardcoded keywords)
# ─────────────────────────────────────────────────────────────────────────────
INTENT_SYSTEM = """You are an intent classifier for a restaurant chatbot.

Given the user's latest message and recent chat history, return ONLY a valid JSON object like:
{
  "action": "suggest_items" | "suggest_combos" | "general",
  "filters": ["veg", "spicy", "dessert", "drinks", "starter", ...],
  "veg_only": true | false,
  "summary": "one sentence describing what the user wants"
}

Rules:
- action = "suggest_combos" → user wants a meal bundle / combo deal
- action = "suggest_items"  → user wants dish recommendations (even if they say "food", "spicy", "vegan", etc.)
- action = "general"        → greeting, reservation, complaints, or anything NOT about the menu
- filters: list of relevant keywords (category names, flavour tags, dietary tags)
- veg_only: true ONLY if user explicitly mentions veg/vegan/vegetarian
- Return ONLY raw JSON. No markdown. No explanation."""


def classify_intent(user_message: str, history: list[FrontendChatItem]) -> dict:
    """Use Groq to classify what the user wants — no hardcoded keywords."""
    recent = history[-4:] if len(history) > 4 else history
    history_text = "\n".join(
        f"{'User' if h.role == 'user' else 'Assistant'}: {h.text}" for h in recent
    )
    prompt = f"""{INTENT_SYSTEM}

Recent conversation:
{history_text}

Latest user message: {user_message}

JSON:"""

    raw = get_groq_client_instance().call_groq_with_retry(prompt)
    print(f"🧠 Intent raw: {raw}")

    # Parse JSON safely
    try:
        # Strip possible markdown ```json ... ```
        clean = re.sub(r"```(?:json)?", "", raw or "").strip().strip("`")
        return json.loads(clean)
    except Exception:
        # Fallback: treat as general
        return {"action": "general", "filters": [], "veg_only": False, "summary": user_message}


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2 — TOOL: Fetch and filter menu from Google Sheets
# ─────────────────────────────────────────────────────────────────────────────
def fetch_filtered_menu(filters: list[str], veg_only: bool) -> list[dict]:
    """Return filtered menu — from cache, Google Sheets only hit once per 5 min."""
    menu = get_cached_menu()

    # Drop zero-price items
    menu = [item for item in menu if item.get("price") and float(item.get("price", 0)) > 0]

    # Apply veg filter
    if veg_only:
        menu = [item for item in menu if item.get("isVeg")]

    # Apply category / keyword filters
    if filters:
        filter_lower = [f.lower() for f in filters]
        filtered = [
            item for item in menu
            if any(
                kw in item.get("name", "").lower() or kw in item.get("category", "").lower()
                for kw in filter_lower
            )
        ]
        menu = filtered if filtered else menu

    return menu


def format_menu_for_llm(menu: list[dict], max_items: int = 60) -> str:
    """Format menu list into a clean text block for the LLM prompt."""
    lines = []
    for item in menu[:max_items]:
        name     = item.get("name", "Unknown")
        price    = item.get("price", 0)
        category = item.get("category", "")
        veg      = "[VEG]" if item.get("isVeg") else "[NON-VEG]"
        lines.append(f"• {name} — ₹{price} {veg} [{category}]")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# STEP 3 — RESPONDER: Groq generates the final reply using menu context
# ─────────────────────────────────────────────────────────────────────────────
RESPONDER_SYSTEM = """You are Harvest by DineIQ, an elegant and warm AI concierge for a premium farm-to-table restaurant experience.

STRICT RULES:
1. ONLY mention items that appear in the MENU block. Never invent items or prices.
2. For vegan/veg queries: ONLY suggest [VEG] items.
3. Language: Use descriptive, appetizing, and sophisticated language. Focus on "freshness", "organic quality", and "local flavors".
4. Tone: Helpful, welcoming, and knowledgeable. Use a few elegant emojis (🌿, 🥗, 🍲, 🥖).
5. No JSON in your reply — plain conversational text only.
6. Do NOT take orders or make reservations.

For COMBO suggestions:
- Hand-pick 2–3 harmonious pairings and give them "Harvest" inspired names (e.g., "Field & Orchard Feast", "Rustic Garden Duo").
- List each included item with its price.
- Clearly state the total and highlight the curated nature of the selection.
- Format each combo clearly separated by decorative lines.

For ITEM suggestions:
- Recommend 3–5 dishes that perfectly match the user's intent.
- Provide a brief, sensory-rich description (e.g., "Crisp seasonal greens...", "Slow-roasted to perfection...").
- Invite the user to explore more or suggest a curated combo pairing."""


def build_response_prompt(
    intent: dict,
    menu_text: str,
    history: list[FrontendChatItem],
    user_message: str,
    client_name: str,
) -> str:
    recent = history[-6:] if len(history) > 6 else history
    history_text = "\n".join(
        f"{'User' if h.role == 'user' else 'Assistant'}: {h.text}" for h in recent
    )
    action  = intent.get("action", "general")
    summary = intent.get("summary", user_message)

    if action == "suggest_combos":
        task = f"Suggest 2-3 combo meals from the MENU. The user wants: {summary}"
    elif action == "suggest_items":
        task = f"Suggest the most relevant dishes from the MENU for: {summary}"
    else:
        task = f"Respond helpfully to: {summary}"

    prompt = f"""{RESPONDER_SYSTEM}

Customer name: {client_name}

Recent conversation:
{history_text}

User's latest message: {user_message}

TASK: {task}

MENU (use ONLY these items — never invent anything else):
{menu_text if menu_text else "No menu available at this time."}

Your reply:"""
    return prompt


# ───────────────────────────────────────────────────────────────────────────────
# STRUCTURED COMBO GENERATOR — returns JSON for frontend cards
# ───────────────────────────────────────────────────────────────────────────────
COMBO_JSON_PROMPT = """
You are a menu combo builder.

Given the menu below, create 2-3 combo meals.
Return ONLY a valid JSON array, nothing else:
[
  {
    "id": "combo_1",
    "name": "Creative Combo Name",
    "items": [
      {"name": "Exact Item Name from Menu", "price": 350},
      {"name": "Another Item", "price": 200}
    ],
    "totalPrice": 550,
    "savings": 0
  }
]

RULES:
- Use ONLY items from the MENU. Do NOT invent items.
- totalPrice = sum of all item prices.
- Each combo should have 2-4 items.
- Give elegant, Harvest-inspired names like "Field & Forest Feast", "Bounty of the Valley", "Heritage Hearth Duo", "Sun-Kissed Garden Select".
- Return valid JSON array only, no markdown, no explanation.
"""

def generate_structured_combos(menu: list[dict], menu_text: str, user_request: str) -> list[dict]:
    """Ask Groq to return structured combo JSON from the real menu, then enrich with real Item_IDs."""
    prompt = f"{COMBO_JSON_PROMPT}\n\nUser requested: {user_request}\n\nMENU:\n{menu_text}\n\nJSON:"
    raw = groq_client.call_groq_with_retry(prompt)
    print(f"🧩 Raw combo JSON: {raw[:300] if raw else 'None'}...")

    # Build a name → {id, price} lookup from real menu for post-processing
    name_lookup: dict[str, dict] = {}
    for item in menu:
        clean = item.get("name", "").strip().lower()
        name_lookup[clean] = {"id": item.get("id", ""), "price": float(item.get("price") or 0)}

    def find_item(item_name: str) -> dict:
        """Fuzzy-match item name against real menu entries."""
        # Clean: "2x Butter Naan" -> "butter naan"
        clean_name = re.sub(r"^\d+x?\s*|x?\d+\s*$", "", item_name).strip().lower()
        
        # 1. Exact match
        if clean_name in name_lookup:
            return name_lookup[clean_name]
            
        # 2. Contains match (robust)
        best_match = None
        max_len = 0
        
        for menu_key, info in name_lookup.items():
            # "butter naan" in "2 butter naan" or vice versa
            if clean_name in menu_key or menu_key in clean_name:
                # Prefer the longer match (more specific)
                if len(menu_key) > max_len:
                    best_match = info
                    max_len = len(menu_key)
        
        if best_match:
            return best_match
            
        print(f"⚠️ Item ID lookup failed for: '{item_name}' (cleaned: '{clean_name}')")
        return {"id": "", "price": 0}

    try:
        clean = re.sub(r"```(?:json)?", "", raw or "").strip().strip("`")
        start = clean.find("[")
        end   = clean.rfind("]") + 1
        if start == -1 or end == 0:
            return []
        combos = json.loads(clean[start:end])

        # Enrich each ingredient with real item_id and real price from Sheets
        for combo in combos:
            enriched_items = []
            total = 0.0
            for ing in combo.get("items", []):
                info = find_item(ing.get("name", ""))
                real_price = info["price"] if info["price"] > 0 else float(ing.get("price", 0))
                item_id    = info["id"] or ""
                enriched_items.append({
                    "name":    ing.get("name"),
                    "price":   real_price,
                    "item_id": item_id,
                })
                total += real_price
            combo["items"]      = enriched_items
            combo["totalPrice"] = round(total, 2)

        return combos
    except Exception as e:
        print(f"⚠️ Combo JSON parse error: {e}")
        return []


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────
@chatbot_router.get("/health")
def health():
    return {"status": "ok", "agent": "DineIQ Agentic Chatbot v2"}


# ─────────────────────────────────────────────────────────────────────────────
# MAIN CHAT ENDPOINT — 3-step agent loop
# ─────────────────────────────────────────────────────────────────────────────
@chatbot_router.post("/llm-chat", response_model=ChatResponse)
async def llm_chat(req: ChatRequest):
    print("\n🤖 /llm-chat — Agentic mode")

    try:
        # ── STEP 1: Classify intent with Groq ────────────────────────────────
        print("🔍 Classifying intent...")
        intent = classify_intent(req.userMessage, req.chatHistory)
        action  = intent.get("action", "general")
        filters = intent.get("filters", [])
        veg_only = intent.get("veg_only", False)

        print(f"✅ Intent: action={action}, filters={filters}, veg_only={veg_only}")

        # ── STEP 2: Get filtered menu from cache (fast) ──────────────────────
        menu      = []
        menu_text = ""
        if action in ("suggest_items", "suggest_combos"):
            try:
                menu = fetch_filtered_menu(filters, veg_only)
                menu_text = format_menu_for_llm(menu)
                print(f"🍽️ {len(menu)} menu items ready for LLM")
            except Exception as e:
                print(f"❌ Menu fetch error: {e}")

        reply_prompt = build_response_prompt(
            intent       = intent,
            menu_text    = menu_text,
            history      = req.chatHistory,
            user_message = req.userMessage,
            client_name  = req.clientName or "Guest",
        )

        # ── STEP 3: Parallel Groq calls ───────────────────────────────────────
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        print("🚀 Starting parallel Groq calls...")
        if action == "suggest_combos" and menu_text:
            combo_task = loop.run_in_executor(
                None, generate_structured_combos, menu, menu_text, req.userMessage
            )
            reply_task = loop.run_in_executor(
                None, get_groq_client_instance().call_groq_with_retry, reply_prompt
            )
            structured_combos, ai_reply = await asyncio.gather(combo_task, reply_task)
            print(f"✅ Parallel done: {len(structured_combos)} combos + reply")
        else:
            structured_combos = []
            ai_reply = await loop.run_in_executor(
                None, get_groq_client_instance().call_groq_with_retry, reply_prompt
            )

        if not ai_reply:
            raise Exception("Empty Groq response")

        return ChatResponse(
            response = ai_reply,
            combos   = [ComboData(**c) for c in structured_combos] if structured_combos else []
        )

    except Exception as e:
        print(f"❌ Agent error in llm_chat: {e}")
        import traceback
        traceback.print_exc()
        return ChatResponse(response="Sorry, I'm having trouble right now. Please try again in a moment!")


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: Customer lookup
# ─────────────────────────────────────────────────────────────────────────────
def find_customer_id(email: str, phone: str):
    rows = get_sheets_client_instance().read_sheet_rows(CUSTOMER_AUTH_SHEET)
    for r in rows:
        sheet_email = (r.get("Customer_Email") or "").strip().lower()
        sheet_phone = (r.get("Customer_Phone") or "").strip()
        if email and email.lower() == sheet_email:
            return r.get("Customer_ID")
        if phone and phone == sheet_phone:
            return r.get("Customer_ID")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: Next Chat ID
# ─────────────────────────────────────────────────────────────────────────────
def generate_next_chat_id():
    try:
        rows = get_sheets_client_instance().read_sheet_rows(CHATS_SHEET)
    except Exception:
        rows = []

    max_num = 0
    for r in rows:
        chat_id = r.get("Chat_ID", "")
        match = re.search(r"Chat_(\d+)", str(chat_id))
        if match:
            max_num = max(max_num, int(match.group(1)))

    return f"Chat_{str(max_num + 1).zfill(5)}"


# ─────────────────────────────────────────────────────────────────────────────
# SAVE CHAT ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────
@chatbot_router.post("/save-chat")
async def save_chat(session: ChatSession):
    print("\n🔥 /save-chat endpoint HIT")
    try:
        customer_id = find_customer_id(session.clientEmail, session.clientPhone)

        if not customer_id:
            print("⚠️ Customer not found. Chat not saved.")
            return {"status": "ignored", "message": "Customer not registered. Chat not saved."}

        chat_id = generate_next_chat_id()
        chat_datetime = session.date or datetime.now(timezone.utc).isoformat()

        row = [
            chat_id,
            customer_id,
            session.clientName or "",
            session.clientPhone or "",
            session.clientEmail or "",
            chat_datetime,
            session.transcriptText or "",
        ]

        get_sheets_client_instance().append_row(CHATS_SHEET, row)
        print(f"✅ Chat saved: {chat_id}")

        return {"status": "success", "chatId": chat_id, "customerId": customer_id}

    except Exception as e:
        print(f"❌ ERROR saving chat: {e}")
        return {"status": "error", "message": str(e)}