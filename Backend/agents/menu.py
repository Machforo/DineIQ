# DineIQ\Backend\agents\menu_agent.py

# ---------------------------------------------------------
# Library and Packages Import
# ---------------------------------------------------------
import os
from dotenv import load_dotenv

from services.sheets import SheetsClient

# ---------------------------------------------------------
# Load environment variables
# ---------------------------------------------------------
load_dotenv()

# ---------------------------------------------------------
# Class definition for Menu related interactions
# ---------------------------------------------------------
class MenuAgent:
    def __init__(self):
        self.spreadsheet_id = os.getenv("SPREADSHEET_ID")
        self.menu_sheet_name = "Menu"

        if not self.spreadsheet_id:
            raise ValueError("SPREADSHEET_ID is not set in environment variables")

        self.sheets_client = SheetsClient(
            spreadsheet_id=self.spreadsheet_id
        )

    # -------------------------------------------------------------------
    # 🍽️ Public API
    # -------------------------------------------------------------------
    def get_menu(self) -> list[dict]:
        """
        Fetch all active dishes from menu sheet.
        Returns only name & current price.
        """

        df = self.sheets_client.read_sheet(self.menu_sheet_name)

        # Defensive column check
        required_columns = {"Item_Name", "Current_Price", "Is_Active"}
        missing = required_columns - set(df.columns)
        if missing:
            raise ValueError(f"Missing columns in Menu sheet: {missing}")

        # Normalize Is_Active
        df["Is_Active"] = (
            df["Is_Active"]
            .astype(str)
            .str.strip()
            .str.lower()
            .isin(["true", "1", "yes"])
        )

        # Filter active items
        df = df[df["Is_Active"]]

        # Shape response for frontend
        return [
            {
                "name": row["Item_Name"],
                "price": float(row["Current_Price"]) if row["Current_Price"] != "" else None
            }
            for _, row in df.iterrows()
        ]

    # -------------------------------------------------------------------
    # 🚧 Future Extensions (stubs)
    # -------------------------------------------------------------------
    def get_smart_combos(self, customer_id: str) -> list:
        return []

    def get_menu_by_category(self, category: str) -> list:
        return []
