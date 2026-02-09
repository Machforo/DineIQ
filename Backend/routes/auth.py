# DineIQ\Backend\routes\auth.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
from fastapi import APIRouter, HTTPException
import random, hashlib, time
import os, re

# -------------------------------------------------------------------
# 🔧 SETUP KEYS and URLs
# -------------------------------------------------------------------
from dotenv import load_dotenv
load_dotenv()

from services.sheets import SheetsClient
sheets_client = SheetsClient(spreadsheet_id=os.getenv("SPREADSHEET_ID"))

from services.email import GmailClient

auth_router = APIRouter()

CUSTOMER_AUTH_SHEET = "Customer_Auth"       # Read-Write from Customer Frontend Web/App

# ---------------------------------------------------------
# Auth Routes
# ---------------------------------------------------------

# -----------------------------
# SIGNUP (email OTP)
# - Name, Email, Phone saved
# -----------------------------
@auth_router.post("/signup")
def signup(payload: dict):
    print(">>> /auth/signup HIT", payload)

    name = payload.get("name")
    email = payload.get("email")
    mobile = payload.get("mobile")

    if not email or not name:
        raise HTTPException(status_code=400, detail="Invalid signup data")

    otp = generate_otp()
    save_otp_for_email(email, otp, name=name, mobile=mobile)
    
    gmail_client = GmailClient()
    gmail_client.send_otp_email(email, otp)

    return {"status": "otp_sent"}

# -----------------------------
# LOGIN (email OR phone)
# - OTP sent only for Email
# -----------------------------
@auth_router.post("/check-user")
def check_user(payload: dict):
    method = payload.get("method")
    value = payload.get("value")

    if method == "email":
        user = find_user_by_email(value)
        if not user:
            return {"status": "not_found"}

        otp = generate_otp()
        save_otp_for_email(value, otp)
        gmail_client = GmailClient()
        gmail_client.send_otp_email(value, otp)

        return {
            "status": "exists",
            "name": user["name"],
            "email": user["email"],
            # "message": "OTP sent to email"     # add real customer email address
        }

    if method == "phone":
        user = find_user_by_phone(value)
        if not user:
            return {"status": "not_found"}

        # Update last login information
        update_last_login_by_phone(value)

        return {
            "status": "exists",
            "name": user["name"],
            "mobile": user["mobile"],
            "email": user["email"],
            # "message": "OTP sent to mobile"     # add real customer mobile number
        }

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
        "name": result["name"],
        "mobile": result["mobile"],
        "email": email,
    }

# ------------------------------------------------------------------
# Auth Helper functions
# - generate otp, hash
# - find user by email/phone
# - save/verify otp for email
# ------------------------------------------------------------------
def generate_otp():
    print(">>> Generating OTP")
    return str(random.randint(100000, 999999))

def sha256(value: str) -> str:
    print(">>> Generating OTP hash")
    return hashlib.sha256(value.encode()).hexdigest()

def find_row_by_email(rows: list[dict], email: str):
    return next(
        (r for r in rows if r.get("Customer_Email") == email),
        None
    )

def find_row_by_phone(rows: list[dict], phone: str):
    phone = str(phone)
    return next(
        (r for r in rows if str(r.get("Customer_Phone", "")) == phone),
        None
    )

def find_user_by_email(email: str):
    print(">>> Finding user by email:", email)

    rows = sheets_client.read_sheet_rows(CUSTOMER_AUTH_SHEET)
    row = find_row_by_email(rows, email)

    if not row:
        return None

    return {
        "name": row.get("Customer_Name"),
        "email": row.get("Customer_Email"),
        "mobile": row.get("Customer_Phone"),
    }

def find_user_by_phone(phone: str):
    print(">>> Finding user by phone:", phone)

    rows = sheets_client.read_sheet_rows(CUSTOMER_AUTH_SHEET)
    row = find_row_by_phone(rows, phone)

    if not row:
        return None

    return {
        "name": row.get("Customer_Name"),
        "email": row.get("Customer_Email"),
        "mobile": row.get("Customer_Phone"),
    }

def update_last_login_by_phone(phone: str):
    rows = sheets_client.read_sheet(CUSTOMER_AUTH_SHEET)

    row = rows[rows["Customer_Phone"].astype(str) == str(phone)]
    if row.empty:
        return

    row_num = row.index[0] + 2
    sheets_client.update_cell(
        CUSTOMER_AUTH_SHEET,
        f"I{row_num}",  # Last_Login_DateTime
        time.strftime("%d/%m/%Y %H:%M:%S"),
    )

def generate_next_customer_id(rows: list[dict]) -> str:
    max_num = 0
    pattern = re.compile(r"Cust_(\d+)")

    for r in rows:
        cid = r.get("Customer_ID", "")
        match = pattern.fullmatch(str(cid))
        if match:
            num = int(match.group(1))
            max_num = max(max_num, num)

    return f"Cust_{max_num + 1:04d}"

def save_otp_for_email(email, otp, name=None, mobile=None):
    print(">>> Saving OTP for:", email)

    rows = sheets_client.read_sheet_rows(CUSTOMER_AUTH_SHEET)

    otp_hash = sha256(otp)
    expiry = int(time.time()) + 300

    row = find_row_by_email(rows, email)

    if row:
        row_index = rows.index(row)
        row_num = row_index + 2  # header offset

        print(">>> Updating existing row:", row_num)

        sheets_client.update_cell(CUSTOMER_AUTH_SHEET, f"F{row_num}", otp_hash)
        sheets_client.update_cell(CUSTOMER_AUTH_SHEET, f"G{row_num}", expiry)
        return

    # ---- New signup ----
    print(">>> New signup, appending row")

    customer_id = generate_next_customer_id(rows)
    print(">>> Generated Customer_ID:", customer_id)

    sheets_client.append_row(
        CUSTOMER_AUTH_SHEET,
        [
            customer_id,                # Customer_ID (A)           <-- Customer ID is created for a new signup
            name or "",                 # Customer_Name (B)
            email,                      # Customer_Email (C)
            mobile or "",               # Customer_Phone (D)
            "",                         # Date_of_Birth (E)         <-- comes from profile update
            otp_hash,                   # OTP_Hash (F)
            expiry,                     # OTP_Expires_At (G)
            time.strftime("%d/%m/%Y %H:%M:%S"),  # Creation_DateTime (H)
            "",                         # Last_Login_DateTime (I)   <-- filled when logged in
            "",                         # Customer_Category (J)     <-- comes from categorization
        ]
    )

def verify_otp_for_email(email, otp):
    print(">>> Verifying OTP for:", email)

    rows = sheets_client.read_sheet_rows(CUSTOMER_AUTH_SHEET)

    entered_hash = sha256(otp)
    now = int(time.time())

    row = find_row_by_email(rows, email)
    if not row:
        return {"ok": False, "message": "Email not found"}

    if not row.get("OTP_Hash"):
        return {"ok": False, "message": "OTP not generated"}

    if now > int(row.get("OTP_Expires_At", 0)):
        return {"ok": False, "message": "OTP expired"}

    if row.get("OTP_Hash") != entered_hash:
        return {"ok": False, "message": "Invalid OTP"}

    # Update last login time
    row_num = rows.index(row) + 2
    sheets_client.update_cell(
        CUSTOMER_AUTH_SHEET,
        f"I{row_num}",  # Last_Login_DateTime
        time.strftime("%d/%m/%Y %H:%M:%S"),
    )

    return {
        "ok": True,
        "name": row.get("Customer_Name"),
        "mobile": row.get("Customer_Phone"),
    }



