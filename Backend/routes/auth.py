# DineIQ\Backend\routes\auth.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
from fastapi import APIRouter, HTTPException
import time
import os

# -------------------------------------------------------------------
# 🔧 SETUP KEYS and URLs
# -------------------------------------------------------------------
from dotenv import load_dotenv
load_dotenv()

from services.dependencies import sqlite_db
from services.email import GmailClient

auth_router = APIRouter()

# ---------------------------------------------------------
# Auth Routes
# ---------------------------------------------------------

# -----------------------------
# SIGNUP (email OTP)
# - Name, Email, Phone saved
# -----------------------------
@auth_router.post("/signup")
def signup(payload: dict):
    try:
        print(">>> /auth/signup HIT", payload)

        name = str(payload.get("name", "")).strip()
        email = str(payload.get("email", "")).strip().lower()
        mobile = str(payload.get("mobile", "")).strip()
        table_number = str(payload.get("table_number", "")).strip()

        if not name or not email or not mobile:
            raise HTTPException(status_code=400, detail="Invalid signup data")

        # --- Check for conflicts ---
        existing_email = sqlite_db.fetch_one("SELECT * FROM customers WHERE LOWER(email) = ?", (email,))
        existing_phone = sqlite_db.fetch_one("SELECT * FROM customers WHERE phone = ?", (mobile,))

        if existing_phone and str(existing_phone.get("email", "")).strip().lower() != email:
            assoc_email = existing_phone.get("email")
            return {"status": "error", "message": f"Another email {assoc_email} is already registered with phone {mobile}"}

        if existing_email and str(existing_email.get("phone", "")).strip() != mobile:
            assoc_phone = existing_email.get("phone")
            return {"status": "error", "message": f"Another phone {assoc_phone} is already registered with email {email}"}

        if existing_email and existing_phone and existing_email["customer_id"] == existing_phone["customer_id"]:
            if str(existing_email.get("name", "")).strip() != str(name).strip():
                assoc_name = existing_email.get("name")
                return {"status": "error", "message": f"Another customer {assoc_name} is already registered with {email} & {mobile}"}

        # --- No conflicts, proceed ---
        otp = generate_otp()
        save_otp_for_email(email, otp, name=name, mobile=mobile, table_number=table_number)
        
        gmail_client = GmailClient()
        gmail_client.send_otp_email(email, otp)

        return {"status": "otp_sent"}
    except Exception as e:
        print("🔥 SIGNUP ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------
# LOGIN (email OR phone)
# - OTP sent only for Email
# -----------------------------
@auth_router.post("/check-user")
def check_user(payload: dict):

    method = payload.get("method")
    value = payload.get("value")
    table_number = payload.get("table_number")

    # ---------------- EMAIL LOGIN ----------------
    if method == "email":

        user = find_user_by_email(value)

        if not user:
            return {"status": "not_found"}

        # Update table number if provided
        if table_number:
            sqlite_db.update("customers", {"table_number": table_number}, {"email": value.strip().lower()})

        otp = generate_otp()
        save_otp_for_email(value, otp)

        gmail_client = GmailClient()
        gmail_client.send_otp_email(value, otp)

        return {
            "status": "exists",
            "id": user.get("id"),
            "name": user["name"],
            "email": user["email"],
            "mobile": user.get("mobile"),
            "table_number": table_number or user.get("table_number"),
        }

    # ---------------- PHONE LOGIN ----------------
    elif method == "phone":

        user = find_user_by_phone(value)

        if not user:
            return {"status": "not_found"}

        # Block login if user never verified
        if not user.get("last_login"):
            return {
                "status": "not_verified",
                "message": "Your account is not verified. Please sign up first."
            }

        # Update table number if provided
        if table_number:
            sqlite_db.update("customers", {"table_number": table_number}, {"phone": value.strip()})

        # Update last login information
        update_last_login_by_phone(value)

        return {
            "status": "exists",
            "id": user.get("id"),
            "name": user["name"],
            "email": user.get("email"),
            "mobile": user.get("mobile"),
            "table_number": table_number or user.get("table_number"),
        }

    else:
        raise HTTPException(status_code=400, detail="Invalid login method")

# -----------------------------
# VERIFY OTP (email only)
# -----------------------------
@auth_router.post("/verify-otp")
def verify_otp(payload: dict):
    email = payload.get("email")
    otp = payload.get("otp")

    result = verify_otp_for_email(email, otp)
    if not result["ok"]:
        return {"status": "error", "message": result["message"]}

    return {
        "status": "ok",
        "id": result.get("id"),
        "name": result["name"],
        "mobile": result["mobile"],
        "email": email,
        "table_number": result.get("table_number"),
    }

# ------------------------------------------------------------------
# Auth Helper functions
# - generate otp, hash
# - find user by email/phone
# - save/verify otp for email
# ------------------------------------------------------------------
def generate_otp():
    print(">>> Generating OTP")
    import random
    return str(random.randint(100000, 999999))

def sha256(value: str) -> str:
    print(">>> Generating OTP hash")
    import hashlib
    return hashlib.sha256(value.encode()).hexdigest()

def find_user_by_email(email: str):
    print(">>> Finding user by email:", email)
    row = sqlite_db.fetch_one("SELECT * FROM customers WHERE LOWER(email) = ?", (email.strip().lower(),))
    if not row: return None
    return {
        "id": row.get("customer_id"),
        "name": row.get("name"),
        "email": row.get("email"),
        "mobile": row.get("phone"),
        "table_number": row.get("table_number"),
        "last_login": row.get("last_login"),
    }

def find_user_by_phone(phone: str):
    print(">>> Finding user by phone:", phone)
    row = sqlite_db.fetch_one("SELECT * FROM customers WHERE phone = ?", (str(phone).strip(),))
    if not row: return None
    return {
        "id": row.get("customer_id"),
        "name": row.get("name"),
        "email": row.get("email"),
        "mobile": row.get("phone"),
        "table_number": row.get("table_number"),
        "last_login": row.get("last_login"),
    }

def update_last_login_by_phone(phone: str):
    now_str = time.strftime("%d/%m/%Y %H:%M:%S")
    sqlite_db.update("customers", {"last_login": now_str}, {"phone": str(phone).strip()})

def generate_next_customer_id() -> str:
    row = sqlite_db.fetch_one("SELECT customer_id FROM customers ORDER BY customer_id DESC LIMIT 1")
    if row and row["customer_id"] and row["customer_id"].startswith("Cust_"):
        import re
        match = re.search(r"(\d+)", row["customer_id"])
        if match:
            num = int(match.group(1))
            return f"Cust_{num + 1:04d}"
    return "Cust_0001"

def save_otp_for_email(email: str, otp: str, name=None, mobile=None, table_number=None):
    print(">>> Saving OTP for:", email)
    otp_hash = sha256(otp)
    expiry = int(time.time()) + 300
    email_clean = email.strip().lower()

    row = sqlite_db.fetch_one("SELECT customer_id FROM customers WHERE LOWER(email) = ?", (email_clean,))
    
    if row:
        c_id = row["customer_id"]
        # Update table number in google sheets
        if table_number:
            sqlite_db.update("customers", {"table_number": table_number}, {"customer_id": c_id})
        
        # Upsert auth
        auth_row = sqlite_db.fetch_one("SELECT * FROM customer_auth WHERE customer_id = ?", (c_id,))
        if auth_row:
            sqlite_db.update("customer_auth", {"otp_hash": otp_hash, "otp_expires_at": expiry}, {"customer_id": c_id})
        else:
            sqlite_db.insert("customer_auth", {"customer_id": c_id, "otp_hash": otp_hash, "otp_expires_at": expiry})
    else:
        # New signup
        c_id = generate_next_customer_id()
        now_str = time.strftime("%d/%m/%Y %H:%M:%S")
        sqlite_db.insert("customers", {
            "customer_id": c_id,
            "name": name or "",
            "email": email_clean,
            "phone": mobile or "",
            "date_of_birth": "",
            "customer_category": "",
            "table_number": table_number or "",
            "created_at": now_str,
            "last_login": ""
        })
        sqlite_db.insert("customer_auth", {
            "customer_id": c_id,
            "otp_hash": otp_hash,
            "otp_expires_at": expiry
        })

def verify_otp_for_email(email: str, otp: str):
    print(">>> Verifying OTP for:", email)
    entered_hash = sha256(otp)
    now = int(time.time())
    email_clean = email.strip().lower()

    row = sqlite_db.fetch_one("""
        SELECT c.*, a.otp_hash, a.otp_expires_at 
        FROM customers c 
        LEFT JOIN customer_auth a ON c.customer_id = a.customer_id 
        WHERE LOWER(c.email) = ?
    """, (email_clean,))

    if not row:
        return {"ok": False, "message": "Email not found"}

    if not row.get("otp_hash"):
        return {"ok": False, "message": "OTP not generated"}

    if now > int(row.get("otp_expires_at", 0) or 0):
        return {"ok": False, "message": "OTP expired"}

    if row.get("otp_hash") != entered_hash:
        return {"ok": False, "message": "Invalid OTP"}

    # Update last login time
    now_str = time.strftime("%d/%m/%Y %H:%M:%S")
    sqlite_db.update("customers", {"last_login": now_str}, {"customer_id": row["customer_id"]})
    sqlite_db.update("customer_auth", {"otp_hash": "", "otp_expires_at": ""}, {"customer_id": row["customer_id"]})

    return {
        "ok": True,
        "id": row.get("customer_id"),
        "name": row.get("name"),
        "mobile": row.get("phone"),
        "table_number": row.get("table_number"),
    }


# ------------------------------------------------------------------
# ✅ STAFF AUTH ENDPOINTS
# ------------------------------------------------------------------

@auth_router.post("/staff/register")
def staff_register(payload: dict):
    try:
        print(">>> /auth/staff/register HIT", payload)

        name  = str(payload.get("name",  "")).strip()
        email = str(payload.get("email", "")).strip().lower()
        phone = str(payload.get("phone", "")).strip()
        role  = str(payload.get("role",  "staff")).strip().lower()

        if not name or not email:
            raise HTTPException(status_code=400, detail="Name and email are required")

        allowed_roles = {"admin", "manager", "chef", "staff"}
        if role not in allowed_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Choose from: {', '.join(allowed_roles)}")

        # Check for existing staff
        existing = sqlite_db.fetch_one("SELECT * FROM staff WHERE LOWER(email) = ?", (email,))
        if existing:
            return {"status": "error", "message": f"A staff account with email {email} already exists. Please use the Login tab."}

        if phone:
            existing_phone = sqlite_db.fetch_one("SELECT * FROM staff WHERE phone = ?", (phone,))
            if existing_phone:
                return {"status": "error", "message": f"Phone {phone} is already registered to another staff member."}

        # Create new staff record and send OTP
        otp = generate_otp()
        save_otp_for_dashboard_user(email, otp, name=name, phone=phone, role=role)

        gmail_client = GmailClient()
        gmail_client.send_otp_email(email, otp)

        return {"status": "otp_sent"}
    except HTTPException:
        raise
    except Exception as e:
        print("🔥 STAFF REGISTER ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@auth_router.post("/staff/login")
def staff_login(payload: dict):
    try:
        print(">>> /auth/staff/login HIT", payload)

        method = str(payload.get("method", "email")).strip().lower()
        value  = str(payload.get("value", "")).strip()

        if not value:
            raise HTTPException(status_code=400, detail="Email or phone is required")

        # ── EMAIL LOGIN (with OTP) ─────────────────────────────────────────────
        if method == "email":
            email = value.lower()
            user = find_dashboard_user_by_email(email)
            if not user:
                return {"status": "not_found", "message": "No account found with this email."}
            if not user.get("is_active"):
                return {"status": "error", "message": "This account has been deactivated. Please contact an admin."}

            otp = generate_otp()
            save_otp_for_dashboard_user(email, otp)

            gmail_client = GmailClient()
            gmail_client.send_otp_email(email, otp)

            return {"status": "otp_sent", "name": user["name"], "role": user["role"]}

        # ── PHONE LOGIN (no OTP, direct session) ──────────────────────────────
        elif method == "phone":
            user = find_dashboard_user_by_phone(value)
            if not user:
                return {"status": "not_found", "message": "No account found with this phone. Please contact administrator."}
            if not user.get("is_active"):
                return {"status": "error", "message": "This account has been deactivated. Please contact an admin."}

            # Direct login — update last_login and return session
            now_str = time.strftime("%d/%m/%Y %H:%M:%S")
            table_name = "master" if user["type"] == "master" else "staff"
            id_col = "master_id" if user["type"] == "master" else "staff_id"
            
            sqlite_db.update(table_name, {"last_login": now_str}, {id_col: user["id"]})

            return {
                "status": "ok",
                "staff_id": user["id"],
                "name":     user["name"],
                "email":    user.get("email", ""),
                "role":     user["role"],
            }

        else:
            raise HTTPException(status_code=400, detail="Invalid login method. Use 'email' or 'phone'.")

    except HTTPException:
        raise
    except Exception as e:
        print("STAFF LOGIN ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))



@auth_router.post("/staff/verify-otp")
def staff_verify_otp(payload: dict):
    try:
        print(">>> /auth/staff/verify-otp HIT")
        email = str(payload.get("email", "")).strip().lower()
        otp   = str(payload.get("otp",   "")).strip()

        if not email or not otp:
            raise HTTPException(status_code=400, detail="Email and OTP are required")

        result = verify_otp_for_dashboard_user(email, otp)
        if not result["ok"]:
            return {"status": "error", "message": result["message"]}

        return {
            "status": "ok",
            "staff_id": result["user_id"],
            "name":     result["name"],
            "email":    email,
            "role":     result["role"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def generate_next_staff_id() -> str:
    row = sqlite_db.fetch_one("SELECT staff_id FROM staff WHERE staff_id LIKE 'Staff_%' ORDER BY staff_id DESC LIMIT 1")
    if row and row["staff_id"]:
        import re
        match = re.search(r"(\d+)", row["staff_id"])
        if match:
            num = int(match.group(1))
            return f"Staff_{num + 1:04d}"
    return "Staff_0001"

def generate_next_master_id() -> str:
    row = sqlite_db.fetch_one("SELECT master_id FROM master WHERE master_id LIKE 'master_%' ORDER BY master_id DESC LIMIT 1")
    if row and row["master_id"]:
        import re
        match = re.search(r"(\d+)", row["master_id"])
        if match:
            num = int(match.group(1))
            return f"master_{num + 1:04d}"
    return "master_0001"


def find_dashboard_user_by_email(email: str):
    email_clean = email.strip().lower()
    # 1. Check master
    row = sqlite_db.fetch_one("SELECT * FROM master WHERE LOWER(email) = ?", (email_clean,))
    if row:
        return {
            "id": row.get("master_id"),
            "name": row.get("name"),
            "email": row.get("email"),
            "phone": row.get("phone"),
            "role": "master", # Force role 'master' for users in master table
            "is_active": row.get("is_active"),
            "last_login": row.get("last_login"),
            "type": "master"
        }
    # 2. Check staff
    row = sqlite_db.fetch_one("SELECT * FROM staff WHERE LOWER(email) = ?", (email_clean,))
    if row:
        return {
            "id": row.get("staff_id"),
            "name": row.get("name"),
            "email": row.get("email"),
            "phone": row.get("phone"),
            "role": row.get("role"),
            "is_active": row.get("is_active"),
            "last_login": row.get("last_login"),
            "type": "staff"
        }
    return None

def find_dashboard_user_by_phone(phone: str):
    phone_clean = str(phone).strip()
    # 1. Check master
    row = sqlite_db.fetch_one("SELECT * FROM master WHERE phone = ?", (phone_clean,))
    if row:
        return {
            "id": row.get("master_id"),
            "name": row.get("name"),
            "email": row.get("email"),
            "phone": row.get("phone"),
            "role": "master", # Force role 'master'
            "is_active": row.get("is_active"),
            "last_login": row.get("last_login"),
            "type": "master"
        }
    # 2. Check staff
    row = sqlite_db.fetch_one("SELECT * FROM staff WHERE phone = ?", (phone_clean,))
    if row:
        return {
            "id": row.get("staff_id"),
            "name": row.get("name"),
            "email": row.get("email"),
            "phone": row.get("phone"),
            "role": row.get("role"),
            "is_active": row.get("is_active"),
            "last_login": row.get("last_login"),
            "type": "staff"
        }
    return None

def save_otp_for_dashboard_user(email: str, otp: str, name=None, phone=None, role="staff"):
    print(">>> Saving Dashboard OTP for:", email)
    otp_hash    = sha256(otp)
    expiry      = int(time.time()) + 300
    email_clean = email.strip().lower()

    user = find_dashboard_user_by_email(email_clean)

    if user:
        u_id = user["id"]
        auth_table = "master_auth" if user["type"] == "master" else "staff_auth"
        id_col = "master_id" if user["type"] == "master" else "staff_id"
        
        auth_row = sqlite_db.fetch_one(f"SELECT * FROM {auth_table} WHERE {id_col} = ?", (u_id,))
        if auth_row:
            sqlite_db.update(auth_table, {"otp_hash": otp_hash, "otp_expires_at": expiry}, {id_col: u_id})
        else:
            sqlite_db.insert(auth_table, {id_col: u_id, "otp_hash": otp_hash, "otp_expires_at": expiry})
    else:
        # Brand-new staff member (via register, though we hide it now)
        s_id     = generate_next_staff_id()
        now_str  = time.strftime("%d/%m/%Y %H:%M:%S")
        sqlite_db.insert("staff", {
            "staff_id":   s_id,
            "name":       name or "",
            "email":      email_clean,
            "phone":      phone or "",
            "role":       role,
            "is_active":  1,
            "created_at": now_str,
            "last_login": "",
        })
        sqlite_db.insert("staff_auth", {
            "staff_id":       s_id,
            "otp_hash":       otp_hash,
            "otp_expires_at": expiry,
        })

def verify_otp_for_dashboard_user(email: str, otp: str):
    print(">>> Verifying Dashboard OTP for:", email)
    entered_hash = sha256(otp)
    now          = int(time.time())
    email_clean  = email.strip().lower()

    user = find_dashboard_user_by_email(email_clean)
    if not user:
        return {"ok": False, "message": "Email not found"}

    auth_table = "master_auth" if user["type"] == "master" else "staff_auth"
    id_col = "master_id" if user["type"] == "master" else "staff_id"
    user_table = "master" if user["type"] == "master" else "staff"

    row = sqlite_db.fetch_one(f"""
        SELECT u.*, a.otp_hash, a.otp_expires_at
        FROM {user_table} u
        LEFT JOIN {auth_table} a ON u.{id_col} = a.{id_col}
        WHERE LOWER(u.email) = ?
    """, (email_clean,))

    if not row or not row.get("otp_hash"):
        return {"ok": False, "message": "OTP not generated"}
    if now > int(row.get("otp_expires_at", 0) or 0):
        return {"ok": False, "message": "OTP expired"}
    if row.get("otp_hash") != entered_hash:
        return {"ok": False, "message": "Invalid OTP"}

    now_str = time.strftime("%d/%m/%Y %H:%M:%S")
    sqlite_db.update(user_table, {"last_login": now_str}, {id_col: user["id"]})
    sqlite_db.update(auth_table, {"otp_hash": "", "otp_expires_at": ""}, {id_col: user["id"]})

    return {
        "ok":      True,
        "user_id": user["id"],
        "name":    row.get("name"),
        "role":    "master" if user["type"] == "master" else row.get("role"),
    }