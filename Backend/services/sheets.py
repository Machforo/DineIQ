# DineIQ\Backend\services\sheets.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
import os
import pandas as pd
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# ---------------------------------------------------------
# Load environment variables from .env file
# ---------------------------------------------------------
from dotenv import load_dotenv
load_dotenv()

# ---------------------------------------------------------
# Class definition for Google Sheets interactions
# ---------------------------------------------------------
class SheetsClient:

    # -------------------------------------------------------------------
    # 🔧 SETUP: Google Sheets
    # Created a new project 'DineIQ Project' in Google Cloud Account.
    # Enabled Google Sheets API for this project.
    # Created a service account 'DineIQ Service Account' with Editor role.
    # Created a new JSON key by clicking on the service account email.
    # Key 'dineIQ_service_account.json' is downloaded, move it to project folder.
    # Added [SERVICE_ACCOUNT_FILE = "dineIQ_service_account.json"] in .env file.
    # -------------------------------------------------------------------
    SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

    def __init__(self, spreadsheet_id: str, service_account_file: str | None = None):
        """
        :param spreadsheet_id: Google Spreadsheet ID
        :param service_account_file: Path to service account JSON.
                                     Defaults to SERVICE_ACCOUNT_FILE env var.
        """
        self.spreadsheet_id = spreadsheet_id
        self.service_account_file = (
            service_account_file or os.getenv("SERVICE_ACCOUNT_FILE")
        )

        if not self.service_account_file:
            raise ValueError("SERVICE_ACCOUNT_FILE is not set")

        self._service = self.init_service()

    # -------------------------------------------------------------------
    # 🔐 Init
    # -------------------------------------------------------------------
    def init_service(self):
        credentials = Credentials.from_service_account_file(
            self.service_account_file,
            scopes=self.SCOPES,
        )
        service = build("sheets", "v4", credentials=credentials)
        return service.spreadsheets()

    # -------------------------------------------------------------------
    # 📖 Read
    # Caching can be added to avoid repeated sheet reads
    # -------------------------------------------------------------------
    def read_sheet(self, sheet_name: str) -> pd.DataFrame:
        """
        Read a Google Sheet into a pandas DataFrame (auto-pads rows).
        """
        result = self._service.values().get(
            spreadsheetId=self.spreadsheet_id,
            range=f"{sheet_name}!A:ZZ",
        ).execute()

        values = result.get("values", [])
        if not values:
            raise ValueError(f"No data found in sheet '{sheet_name}'.")

        headers, rows = values[0], values[1:]

        clean_rows = [
            r + [""] * (len(headers) - len(r)) if len(r) < len(headers) else r[:len(headers)]
            for r in rows
        ]

        return pd.DataFrame(clean_rows, columns=headers)

    # -------------------------------------------------------------------
    # 📖 Read - Lightweight Reader (non-pandas)
    # -------------------------------------------------------------------
    def read_sheet_rows(self, sheet_name: str) -> list[dict]:
        result = self._service.values().get(
            spreadsheetId=self.spreadsheet_id,
            range=f"{sheet_name}!A:ZZ",
        ).execute()

        values = result.get("values", [])
        if not values:
            return []

        headers = values[0]
        rows = values[1:]

        return [
            dict(zip(headers, r + [""] * (len(headers) - len(r))))
            for r in rows
        ]

    # -------------------------------------------------------------------
    # ✍️ Update columns in sheet
    # -------------------------------------------------------------------
    def update_sheet(
        self,
        sheet_name: str,
        df: pd.DataFrame,
        columns_to_update: list[str] | None = None,
    ):
        """
        Update specific columns in a Google Sheet without clearing the sheet.
        - Preserves formatting & dropdowns
        - Supports non-contiguous columns
        - Minimizes write operations
        """
        if columns_to_update is None:
            columns_to_update = df.columns.tolist()

        print(f"\n📝 Updating columns individually: {', '.join(columns_to_update)}")

        for col in columns_to_update:
            if col not in df.columns:
                print(f"⚠️ Column '{col}' not found in DataFrame — skipping.")
                continue

            col_idx = df.columns.get_loc(col) + 1
            col_letter = self._col_letter(col_idx)

            values = [[v] for v in df[col].tolist()]

            self._service.values().update(
                spreadsheetId=self.spreadsheet_id,
                range=f"{sheet_name}!{col_letter}2",
                valueInputOption="RAW",
                body={"values": values},
            ).execute()

            print(f"✅ Column '{col}' updated ({col_letter})")

        print(f"✅ Partial update completed for sheet '{sheet_name}'.")

    # -------------------------------------------------------------------
    # ✍️ Append a single row at the end of the sheet.
    # -------------------------------------------------------------------
    def append_row(self, sheet_name: str, row: list):
        """
        Append a single row at the end of the sheet.
        """
        self._service.values().append(
            spreadsheetId=self.spreadsheet_id,
            range=f"{sheet_name}!A:ZZ",
            valueInputOption="RAW",
            insertDataOption="INSERT_ROWS",
            body={"values": [row]},
        ).execute()
    
    # -------------------------------------------------------------------
    # ✍️ Update a cell in sheet
    # -------------------------------------------------------------------
    def update_cell(self, sheet_name: str, cell: str, value):
        """
        Update a single cell in a Google Sheet.
        Example: update_cell("Customer_Auth", "H2", "2026-01-01 10:30:00")
        """
        self._service.values().update(
            spreadsheetId=self.spreadsheet_id,
            range=f"{sheet_name}!{cell}",
            valueInputOption="RAW",
            body={"values": [[value]]},
        ).execute()

    # -------------------------------------------------------------------
    # 🔠 Utilities
    # -------------------------------------------------------------------
    @staticmethod
    def _col_letter(n: int) -> str:
        """Convert 1-based column index to A, B, ..., AA, AB, etc."""
        result = ""
        while n > 0:
            n, remainder = divmod(n - 1, 26)
            result = chr(65 + remainder) + result
        return result
