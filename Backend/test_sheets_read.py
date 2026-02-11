
import os
import sys
import time
from dotenv import load_dotenv

sys.path.append(os.getcwd())
load_dotenv()

try:
    from services.sheets import SheetsClient
    
    print(">>> Testing Sheet Read Performance...")
    
    spreadsheet_id = os.getenv("SPREADSHEET_ID")
    service_account_file = os.getenv("SERVICE_ACCOUNT_FILE", "dineIQ_service_account.json")
    client = SheetsClient(spreadsheet_id, service_account_file)
    
    start_time = time.time()
    print("Reading 'Orders' sheet...")
    rows = client.read_sheet_rows("Orders")
    print(f"✅ Read 'Orders': {len(rows)} rows in {time.time() - start_time:.2f}s")
    
    start_time = time.time()
    print("Reading 'Order_Items' sheet...")
    rows_items = client.read_sheet_rows("Order_Items")
    print(f"✅ Read 'Order_Items': {len(rows_items)} rows in {time.time() - start_time:.2f}s")
    
except Exception as e:
    print(f"❌ FAILED: {e}")
