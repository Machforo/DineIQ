# Backend/routes/menu_tickets.py

from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from services.dependencies import sqlite_db, sheets

import json
import uuid
import time

tickets_router = APIRouter()



@tickets_router.get(
"/list")

async def list_tickets(status: Optional[str] = None, creator_id: Optional[str] = None):

    """List all menu tickets, optionally filtered by status or creator."""
    query = "SELECT * FROM menu_tickets"
    params = []
    
    conditions = []
    if status:
        conditions.append("ticket_status = ?")
        params.append(status.upper())
    if creator_id:
        conditions.append("creator_id = ?")
        params.append(creator_id)
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    query += " ORDER BY created_at DESC"
    
    try:
        tickets = sqlite_db.fetch_all(query, tuple(params))
        # Parse proposed_data JSON strings
        for t in tickets:
            if t.get("proposed_data"):
                try:
                    t["proposed_data"] = json.loads(t["proposed_data"])
                except:
                    t["proposed_data"] = {}
        return tickets
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@tickets_router.post(

"/submit")
async def submit_ticket(request: Request):
    """
    Submit a new menu change ticket (ADD, EDIT, DELETE).
    """
    try:
        payload = await request.json()
        
        ticket_type = str(payload.get("ticket_type", "")).upper()
        if ticket_type not in ["ADD", "EDIT", "DELETE"]:
            raise HTTPException(status_code=400, detail="Invalid ticket type. Use ADD, EDIT, or DELETE.")
            
        item_id = payload.get("item_id")
        if ticket_type in ["EDIT", "DELETE"] and not item_id:
            raise HTTPException(status_code=400, detail="item_id is required for EDIT or DELETE tickets.")
            
        # Check if there's already an active ticket for this item
        if item_id:
            existing = sqlite_db.fetch_one(
                "SELECT ticket_id, ticket_status FROM menu_tickets WHERE item_id = ? AND ticket_status != 'CLOSED'",
                (item_id,)
            )
            if existing:
                if existing["ticket_status"] == "NEEDS_REWORK":
                    # Resubmit existing ticket: update data & reset status
                    sqlite_db.update("menu_tickets", {
                        "proposed_data": json.dumps(proposed_data),
                        "ticket_status": "PENDING",
                        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")
                    }, {"ticket_id": existing["ticket_id"]})
                    return {"status": "ok", "message": "Ticket resubmitted successfully", "ticket_id": existing["ticket_id"]}
                else:
                    raise HTTPException(status_code=400, detail=f"This item already has a {existing['ticket_status']} ticket.")


        creator_id   = payload.get("creator_id")
        creator_name = payload.get("creator_name")
        creator_role = payload.get("creator_role")
        proposed_data = payload.get("proposed_data", {})
        
        # Get next sequential integer ID with 'Tick_0001' format
        # Extract the numeric part (from position 6 onwards) and cast to integer
        max_id_res = sqlite_db.fetch_one("SELECT MAX(CAST(SUBSTR(ticket_id, 6) AS INTEGER)) as max_val FROM menu_tickets")
        next_id = 1
        if max_id_res and max_id_res["max_val"] is not None:
            next_id = int(max_id_res["max_val"]) + 1
        
        ticket_id = f"Tick_{next_id:04d}"



        
        ticket_data = {
            "ticket_id":     ticket_id,
            "ticket_type":   ticket_type,
            "item_id":       item_id,
            "creator_id":    creator_id,
            "creator_name":  creator_name,
            "creator_role":  creator_role,
            "proposed_data": json.dumps(proposed_data),
            "ticket_status": "PENDING",
            "created_at":    time.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at":    time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        sqlite_db.insert("menu_tickets", ticket_data)
        return {"status": "ok", "message": "Ticket submitted successfully", "ticket_id": ticket_id}
        
    except HTTPException:
        raise
    except Exception as e:
        print("🔥 SUBMIT TICKET ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@tickets_router.post(

"/action")
async def action_ticket(request: Request):
    """
    Admin action on a ticket (APPROVE, REJECT, REWORK).
    """
    try:
        payload = await request.json()
        ticket_id = payload.get("ticket_id")
        action    = str(payload.get("action", "")).upper() # APPROVE, REJECT, REWORK
        
        if not ticket_id or action not in ["APPROVE", "REJECT", "REWORK"]:
            raise HTTPException(status_code=400, detail="ticket_id and valid action are required.")
            
        admin_id    = payload.get("admin_id")
        admin_name  = payload.get("admin_name")
        admin_role  = payload.get("admin_role")
        admin_notes = payload.get("admin_notes", "")
        schedule    = payload.get("publish_schedule", "IMMEDIATE")

        ticket = sqlite_db.fetch_one("SELECT * FROM menu_tickets WHERE ticket_id = ?", (ticket_id,))
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        if ticket["ticket_status"] != "PENDING":
            raise HTTPException(status_code=400, detail=f"Ticket is already {ticket['ticket_status']}")

        status_map = {
            "APPROVE": "APPROVED",
            "REJECT":  "REJECTED",
            "REWORK":  "NEEDS_REWORK"
        }
        
        updates = {
            "ticket_status":    status_map[action],
            "admin_id":         admin_id,
            "admin_name":       admin_name,
            "admin_role":       admin_role,
            "admin_action":     action,
            "admin_notes":      admin_notes,
            "publish_schedule": schedule,
            "actioned_at":      time.strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at":       time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        sqlite_db.update("menu_tickets", updates, {"ticket_id": ticket_id})
        return {"status": "ok", "message": f"Ticket {action}ed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print("🔥 ACTION TICKET ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@tickets_router.post(

"/acknowledge")
async def acknowledge_ticket(request: Request):
    """
    Creator acknowledges the admin's decision.
    If APPROVED: The change is merged into the live menu.
    If REJECTED/REWORK: The ticket is closed.
    """
    try:
        payload = await request.json()
        ticket_id = payload.get("ticket_id")
        
        if not ticket_id:
            raise HTTPException(status_code=400, detail="ticket_id is required")
            
        ticket = sqlite_db.fetch_one("SELECT * FROM menu_tickets WHERE ticket_id = ?", (ticket_id,))
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
            
        if ticket["ticket_status"] not in ["APPROVED", "REJECTED", "NEEDS_REWORK"]:
            raise HTTPException(status_code=400, detail="Ticket must be APPROVED, REJECTED, or NEEDS_REWORK to acknowledge.")

        # IF APPROVED -> MERGE TO LIVE MENU
        if ticket["ticket_status"] == "APPROVED":
            proposed_data = json.loads(ticket["proposed_data"])
            item_id = ticket["item_id"]
            ticket_type = ticket["ticket_type"]

            if ticket_type == "ADD":
                # Ensure item_id doesn't exist
                if not item_id:
                    item_id = proposed_data.get("item_id")
                
                existing = sqlite_db.fetch_one("SELECT item_id FROM menu WHERE item_id = ?", (item_id,))
                if existing:
                    # If it somehow already exists, we might need a new ID or it's an error
                    pass
                
                proposed_data["version"] = 1
                sqlite_db.insert("menu", proposed_data)
                
            elif ticket_type == "EDIT":
                # Get current version
                curr = sqlite_db.fetch_one("SELECT version FROM menu WHERE item_id = ?", (item_id,))
                new_version = (curr["version"] or 1) + 1 if curr else 1
                proposed_data["version"] = new_version
                sqlite_db.update("menu", proposed_data, {"item_id": item_id})
                
            elif ticket_type == "DELETE":
                sqlite_db.execute("DELETE FROM menu WHERE item_id = ?", (item_id,))

        # Update ticket as CLOSED
        sqlite_db.update("menu_tickets", {
            "ticket_status": "CLOSED",
            "acknowledged_by_creator": 1,
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }, {"ticket_id": ticket_id})
        
        return {"status": "ok", "message": "Ticket acknowledged and closed."}
        
    except HTTPException:
        raise
    except Exception as e:
        print("🔥 ACKNOWLEDGE TICKET ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
