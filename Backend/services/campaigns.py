# DineIQ\Backend\services\campaigns.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
import os
import re
from typing import List
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field

# ---------------------------------------------------------
# Load environment variables from .env file
# ---------------------------------------------------------
from dotenv import load_dotenv
load_dotenv()

# ---------------------------------------------------------
# SQLite Database Client
# ---------------------------------------------------------
from services.dependencies import sqlite_db

# ---------------------------------------------------------
# Router
# ---------------------------------------------------------
campaigns_router = APIRouter()

# ---------------------------------------------------------
# Internal Model
# ---------------------------------------------------------
class CampaignInternal(BaseModel):
    campaign_text: str
    target_customer_category: str
    start_datetime: str
    end_datetime: str
    campaign_message_count: int = Field(ge=0, le=10)
    campaign_type: str = ""
    message_templates: List[str]
    message_send_timings: List[str]


# ---------------------------------------------------------
# Utilities
# ---------------------------------------------------------
def generate_campaign_id() -> str:
    rows = sqlite_db.fetch_all("SELECT campaign_id FROM campaigns")
    existing_ids = [r["campaign_id"] for r in rows if r["campaign_id"]]
    
    pattern = re.compile(r"Cmp_(\d+)")
    nums = [
        int(pattern.search(cid).group(1))
        for cid in existing_ids
        if cid and pattern.search(cid)
    ]
    next_id = max(nums) + 1 if nums else 1
    return f"Cmp_{next_id:04d}"


def compute_campaign_status(start_dt: datetime, end_dt: datetime) -> str:
    now = datetime.now()
    if start_dt <= now <= end_dt:
        return "ACTIVE"
    if now > end_dt:
        return "INACTIVE"
    return "UPCOMING"


# ---------------------------------------------------------
# Payload normalization
# ---------------------------------------------------------
def normalize_frontend_campaign(payload: dict) -> CampaignInternal:
    templates, timings = [], []

    count = int(payload.get("campaignMessageCount", 0))

    for i in range(1, count + 1):
        if payload.get(f"messageTemplate{i}"):
            templates.append(payload[f"messageTemplate{i}"])
        if payload.get(f"messageSendTiming{i}"):
            timings.append(payload[f"messageSendTiming{i}"])

    return CampaignInternal(
        campaign_text=payload["campaignText"],
        target_customer_category=payload["targetClientCategory"],
        start_datetime=payload["startDateTime"],
        end_datetime=payload["endDateTime"],
        campaign_message_count=count,
        campaign_type=payload.get("campaignType", ""),
        message_templates=templates,
        message_send_timings=timings,
    )


# ---------------------------------------------------------
# Core processor
# ---------------------------------------------------------
def process_single_campaign(campaign: CampaignInternal):
    
    # 1️⃣ Generate Campaign ID
    campaign_id = generate_campaign_id()

    # 2️⃣ Compute status
    start_dt = datetime.strptime(campaign.start_datetime, "%Y-%m-%d %H:%M")
    end_dt = datetime.strptime(campaign.end_datetime, "%Y-%m-%d %H:%M")
    status = compute_campaign_status(start_dt, end_dt)

    # 3️⃣ Insert into campaigns table
    sqlite_db.insert("campaigns", {
        "campaign_id": campaign_id,
        "text": campaign.campaign_text,
        "target_customer_category": campaign.target_customer_category,
        "start_datetime": campaign.start_datetime,
        "end_datetime": campaign.end_datetime,
        "message_count": campaign.campaign_message_count,
        "campaign_type": campaign.campaign_type or "",
        "status": status
    })

    # 4️⃣ Insert into campaign_messages table
    for i in range(campaign.campaign_message_count):
        msg_template = campaign.message_templates[i] if i < len(campaign.message_templates) else ""
        msg_timing = campaign.message_send_timings[i] if i < len(campaign.message_send_timings) else ""
        
        sqlite_db.insert("campaign_messages", {
            "campaign_id": campaign_id,
            "message_text": msg_template,
            "send_timing": msg_timing
        })

    return campaign_id, status


# ---------------------------------------------------------
# 🚀 API: Add Campaign
# ---------------------------------------------------------
@campaigns_router.post("/add")
async def add_campaign(request: Request):
    try:
        print("\n🔥 /campaigns/add endpoint HIT")
        payload = await request.json()
        print("📥 Incoming campaign payload:", payload)

        campaign = normalize_frontend_campaign(payload)
        campaign_id, status = process_single_campaign(campaign)

        return {
            "campaign_id": campaign_id,
            "campaign_status": status,
            "message": "Campaign created successfully (SQLite)",
        }
    except Exception as e:
        import traceback
        print("❌ Campaign Creation Error:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
