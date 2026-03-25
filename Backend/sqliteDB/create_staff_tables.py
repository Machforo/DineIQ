"""
One-time script to create the staff and staff_auth tables in the live SQLite database.
Run from the Backend directory: python sqliteDB/create_staff_tables.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "DineIQ_Database.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS staff (
    staff_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'staff',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS staff_auth (
    staff_id TEXT PRIMARY KEY,
    otp_hash TEXT,
    otp_expires_at TEXT,
    FOREIGN KEY (staff_id) REFERENCES staff(staff_id)
)
""")

conn.commit()
conn.close()
print("Tables 'staff' and 'staff_auth' created successfully.")
