# DineIQ\Backend\routes\kitchen.py
# Kitchen Display System — Backend Routes

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import datetime

from services.dependencies import sqlite_db

kitchen_router = APIRouter()

# ─────────────────────────────────────────────────────────
# DB Migration: ensure kitchen columns exist on first use
# ─────────────────────────────────────────────────────────
def _ensure_kitchen_columns():
    """
    Idempotently adds Kitchen-specific columns to orders and order_items.
    Safe to call on every startup.
    """
    existing_order_cols = [
        row["name"] for row in sqlite_db.fetch_all("PRAGMA table_info(orders)")
    ]
    existing_item_cols = [
        row["name"] for row in sqlite_db.fetch_all("PRAGMA table_info(order_items)")
    ]

    if "instructions" not in existing_order_cols:
        sqlite_db.execute(
            "ALTER TABLE orders ADD COLUMN instructions TEXT DEFAULT ''"
        )
    if "status" not in existing_item_cols:
        sqlite_db.execute(
            "ALTER TABLE order_items ADD COLUMN status TEXT DEFAULT 'PENDING'"
        )
    if "special_instructions" not in existing_item_cols:
        sqlite_db.execute(
            "ALTER TABLE order_items ADD COLUMN special_instructions TEXT DEFAULT ''"
        )

_ensure_kitchen_columns()


# ─────────────────────────────────────────────────────────
# Request Models
# ─────────────────────────────────────────────────────────
class UpdateItemStatusRequest(BaseModel):
    order_item_id: str
    status: str  # PENDING | PREPARING | READY


class UpdateOrderStatusRequest(BaseModel):
    order_id: str
    status: str  # PENDING | PREPARING | READY | SERVED | CANCELLED


# ─────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────
KITCHEN_ACTIVE_STATUSES = ("CREATED", "PENDING", "PREPARING", "READY")

def _compute_order_kitchen_status(items: list) -> str:
    """Derive aggregate order status from its item statuses."""
    statuses = [i["item_status"] for i in items]
    if all(s == "READY" for s in statuses):
        return "READY"
    if any(s == "PREPARING" for s in statuses):
        return "PREPARING"
    return "PENDING"


def _elapsed_minutes(created_at: str) -> int:
    """Return minutes elapsed since created_at (DD/MM/YYYY HH:MM:SS or ISO)."""
    if not created_at:
        return 0
    try:
        for fmt in ("%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
            try:
                dt = datetime.datetime.strptime(created_at, fmt)
                delta = datetime.datetime.now() - dt
                return max(0, int(delta.total_seconds() / 60))
            except ValueError:
                continue
    except Exception:
        pass
    return 0


# ─────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────

@kitchen_router.get("/orders")
def get_kitchen_orders():
    """
    Returns all active orders with their items (joined with menu for name/category).
    Active = status not in (SERVED, CANCELLED, COMPLETED).
    """
    try:
        orders = sqlite_db.fetch_all(
            """
            SELECT order_id, table_number, status, instructions, created_at, order_price
            FROM orders
            WHERE UPPER(COALESCE(status, 'CREATED')) NOT IN ('SERVED', 'CANCELLED', 'COMPLETED')
            ORDER BY created_at ASC
            """
        )

        result = []
        for order in orders:
            order_id = order["order_id"]
            items = sqlite_db.fetch_all(
                """
                SELECT
                    oi.order_item_id,
                    oi.item_id,
                    oi.quantity,
                    oi.price,
                    COALESCE(oi.status, 'PENDING')  AS item_status,
                    COALESCE(oi.special_instructions, '') AS special_instructions,
                    COALESCE(m.name, oi.item_id)         AS item_name,
                    COALESCE(m.category, 'Other')        AS item_category
                FROM order_items oi
                LEFT JOIN menu m ON oi.item_id = m.item_id
                WHERE oi.order_id = ?
                """,
                (order_id,)
            )

            elapsed = _elapsed_minutes(order.get("created_at", ""))
            agg_status = _compute_order_kitchen_status(items)

            result.append({
                "order_id": order_id,
                "table_number": order.get("table_number", "—"),
                "order_status": agg_status,  # We send the derived live status for Kitchen purposes
                "instructions": order.get("instructions") or "",
                "created_at": order.get("created_at", ""),
                "elapsed_minutes": elapsed,
                "is_delayed": elapsed >= 20,
                "items": items
            })

        return {"orders": result}

    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@kitchen_router.patch("/item-status")
def update_item_status(req: UpdateItemStatusRequest):
    """Update the Kitchen status of a single order item."""
    valid = {"PENDING", "PREPARING", "READY"}
    if req.status.upper() not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid}")

    try:
        rows_affected = sqlite_db.update(
            "order_items",
            {"status": req.status.upper()},
            {"order_item_id": req.order_item_id},
            queue_for_sync=False  # Kitchen changes don't need sheet sync
        )
        if rows_affected == 0:
            raise HTTPException(status_code=404, detail="Order item not found")

        # Automatically bubble up the aggregate status to the main orders table!
        try:
            item_data = sqlite_db.fetch_all("SELECT order_id FROM order_items WHERE order_item_id = ?", (req.order_item_id,))
            if item_data:
                o_id = item_data[0]["order_id"]
                all_items = sqlite_db.fetch_all("SELECT COALESCE(status, 'PENDING') as item_status FROM order_items WHERE order_id = ?", (o_id,))
                if all_items:
                    agg_status = _compute_order_kitchen_status(all_items)
                    sqlite_db.update("orders", {"status": agg_status}, {"order_id": o_id}, queue_for_sync=False)
        except Exception:
            pass # Non-fatal if order status sync somehow fails

        return {"success": True, "order_item_id": req.order_item_id, "status": req.status.upper()}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@kitchen_router.patch("/order-status")
def update_order_status(req: UpdateOrderStatusRequest):
    """Update the top-level status of an order (e.g. mark SERVED)."""
    valid = {"PENDING", "PREPARING", "READY", "SERVED", "CANCELLED", "CREATED"}
    if req.status.upper() not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid}")

    try:
        rows_affected = sqlite_db.update(
            "orders",
            {"status": req.status.upper()},
            {"order_id": req.order_id},
            queue_for_sync=False
        )
        if rows_affected == 0:
            raise HTTPException(status_code=404, detail="Order not found")

        return {"success": True, "order_id": req.order_id, "status": req.status.upper()}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
