
import os
import sys
from dotenv import load_dotenv

# Add current directory to path so we can import modules
sys.path.append(os.getcwd())

# Load Env
load_dotenv()

try:
    from services.sheets import SheetsClient
    
    print(">>> Testing Google Sheets Connection...")
    
    spreadsheet_id = os.getenv("SPREADSHEET_ID")
    service_account_file = os.getenv("SERVICE_ACCOUNT_FILE", "dineIQ_service_account.json")
    
    print(f"Spreadsheet ID: {spreadsheet_id}")
    print(f"Service Account File: {service_account_file}")
    
    if not os.path.exists(service_account_file):
        print(f"❌ ERROR: Service account file '{service_account_file}' NOT found!")
        sys.exit(1)
        
    client = SheetsClient(spreadsheet_id, service_account_file)
    
    print(">>> Attempting to read 'Customer_Auth' sheet...")
    rows = client.read_sheet_rows("Customer_Auth")
    
    print(f"✅ Success! Read {len(rows)} rows.")
    if rows:
        print("First row data sample:", rows[0])
    
except Exception as e:
    print(f"❌ FAILED: {e}")
    import traceback
    traceback.print_exc()
