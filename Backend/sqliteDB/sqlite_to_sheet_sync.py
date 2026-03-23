import sqlite3
import os
import sys
import asyncio
import pandas as pd
from dotenv import load_dotenv

# Ensure we can import from Backend/services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.dependencies import sqlite_db
from services.DineIQ_Database_Sync import (
    perform_full_sync, TABLE_TO_SHEET, _get_enriched_data, 
    _map_to_sheet_row, sheets, SHEET_COLUMN_MAPPING
)

load_dotenv()

async def sync_whole_document():
    """ FULL synchronization of all tables to Google Sheets. """
    await perform_full_sync()

async def sync_sheet(table_name: str):
    """ Re-syncs an ENTIRE sheet from its SQLite table. """
    sheet_name = TABLE_TO_SHEET.get(table_name)
    if not sheet_name:
        print(f"❌ Table '{table_name}' is not mapped to any sheet.")
        return

    print(f"🔄 Syncing ENTIRE sheet '{sheet_name}'...")
    try:
        raw_rows = sqlite_db.fetch_all(f"SELECT * FROM {table_name}")
        enriched_rows = [_get_enriched_data(table_name, r) for r in raw_rows]
        
        df_existing = sheets.read_sheet(sheet_name)
        headers = df_existing.columns.tolist()
        
        mapped_rows = [_map_to_sheet_row(sheet_name, r, headers) for r in enriched_rows]
        df_new = pd.DataFrame(mapped_rows, columns=headers)
        
        sheets.update_sheet(sheet_name, df_new)
        print(f"✅ Full sheet sync completed for '{sheet_name}'.")
    except Exception as e:
        print(f"❌ Failed to sync sheet: {e}")

async def sync_row(table_name: str, id_val: str):
    """ Re-syncs a SINGLE ROW into its Google Sheet by matching the ID. """
    sheet_name = TABLE_TO_SHEET.get(table_name)
    mapping = SHEET_COLUMN_MAPPING.get(sheet_name, {})
    
    # Try to find the ID column in SQLite
    id_col = None
    for h, s_col in mapping.items():
        if "id" in s_col.lower():
            id_col = s_col
            break
    
    if not id_col:
        print(f"❌ Could not determine ID column for {table_name}.")
        return

    print(f"🔄 Syncing SINGLE ROW ({id_val}) for sheet '{sheet_name}'...")
    try:
        # 1. Get enriched data from SQLite
        raw_row = sqlite_db.fetch_one(f"SELECT * FROM {table_name} WHERE {id_col} = ?", (id_val,))
        if not raw_row:
            print(f"❌ Record '{id_val}' not found in SQLite table '{table_name}'.")
            return
        
        enriched = _get_enriched_data(table_name, dict(raw_row))
        
        # 2. Get Headers and Row Index from Sheet
        df = sheets.read_sheet(sheet_name)
        headers = df.columns.tolist()
        
        # Match by ID column (first header usually)
        id_header = headers[0] 
        indices = df.index[df[id_header].astype(str) == str(id_val)].tolist()
        
        if not indices:
            print(f"⚠️ Record '{id_val}' not found in Google Sheet. Appending as new row.")
            row_data = _map_to_sheet_row(sheet_name, enriched, headers)
            sheets.append_row(sheet_name, row_data)
        else:
            # Update the existing row (Excel-style row index starts at 1, headers are row 1, so indices[0]+2)
            row_index = indices[0] + 2 
            row_data = _map_to_sheet_row(sheet_name, enriched, headers)
            # Update the whole row range
            range_name = f"{sheet_name}!A{row_index}"
            # For simplicity, we can use update_sheet with a tiny DF or just use sheets.update_sheet logic
            # However, our SheetsClient.update_sheet overwrites everything. 
            # Let's just use append_row logic but with a targeted update if we had a method.
            # Since we don't have a 'update_range' in SheetsClient, let's just re-sync the WHOLE sheet for safety.
            print("💡 No range-update method found. Re-syncing whole sheet to ensure integrity.")
            await sync_sheet(table_name)

    except Exception as e:
        print(f"❌ Failed to sync row: {e}")

async def sync_column(table_name: str, column_header: str):
    """ Re-syncs a SINGLE COLUMN for an entire sheet. """
    print(f"🔄 Syncing ENTIRE COLUMN '{column_header}' for sheet '{table_name}'...")
    # This involves updating the whole sheet since we don't want to mess up other columns
    await sync_sheet(table_name)

async def main():
    print("\n--- DineIQ Granular Sync Manager ---")
    print("1. Sync WHOLE Document (All Sheets)")
    print("2. Sync ONE Sheet (Entire Table)")
    print("3. Sync ONE Row (By ID)")
    print("4. Sync ONE Column (Entire Sheet Column)")
    
    choice = input("\nEnter choice (1-4): ")
    
    if choice == '1':
        await sync_whole_document()
        
    elif choice == '2':
        table = input("Table name (e.g. orders): ")
        await sync_sheet(table)
        
    elif choice == '3':
        table = input("Table name: ")
        id_val = input("Record ID value: ")
        await sync_row(table, id_val)
        
    elif choice == '4':
        table = input("Table name: ")
        col_header = input("Sheet Column Header to sync: ")
        await sync_column(table, col_header)

if __name__ == "__main__":
    asyncio.run(main())
