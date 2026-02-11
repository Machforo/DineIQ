# DineIQ Backend API
# ---------------------------------------------------------
# Modular Architecture Entry Point
# ---------------------------------------------------------

# CRITICAL: Import startup FIRST to decode credentials before any other imports
import startup  # This decodes Base64 credentials if on Render

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load Env
load_dotenv()

# Import Routers
from routes.auth import auth_router
from routes.order import order_router
from agents.menu import menu_router
from agents.recommendation import recommendation_router
from agents.chatbot import chatbot_router
from services.campaigns import campaigns_router

# Initialize App
app = FastAPI(title="DineIQ Backend API", version="2.0")

# CORS Configuration
# Allow both production (Vercel) and development (localhost) origins
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Will be configured via environment variable
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Register Routers
# ---------------------------------------------------------
# Auth: Login, Signup, OTP
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])

# Menu: Fetch Menu, AI Combos (Future)
app.include_router(menu_router, prefix="/menu", tags=["Menu"])

# Orders: Checkout, Place Order, Pricing Strategy
app.include_router(order_router, tags=["Orders"]) 
# Note: order_router has /pricing-strategy at root level to match frontend

# Recommendations: Upsell, Add-ons, Preferences
# Frontend calls /item-addons at root, let's include it at root for compatibility
app.include_router(recommendation_router, tags=["Recommendations"]) 

# Chatbot: AI Chat
app.include_router(chatbot_router, prefix="/chatbot", tags=["Chatbot"])

# Campaigns: Marketing
app.include_router(campaigns_router, prefix="/campaigns", tags=["Campaigns"])


# ---------------------------------------------------------
# Health Check
# ---------------------------------------------------------
@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "DineIQ Backend", "version": "2.0"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"🚀 Starting DineIQ Backend on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
